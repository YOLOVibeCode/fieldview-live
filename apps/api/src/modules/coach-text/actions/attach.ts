/**
 * ATTACH: puts the live stream on the coach's game, or asks which one.
 *
 * At most two questions follow one another: which game, then which stream. A
 * stream question never leads to another question.
 */

import type { CoachTextQuestion, CoachTextQuestionOption } from '@fieldview/data-model';

import { questionTtlSeconds } from '../config';
import type { CoachGame, LiveStream } from '../interfaces';
import { replies, type ListedOption } from '../reply/replies';
import { isHttpsUrl, orderByMatch, planAttach } from '../resolve/GameResolver';

import { clockTime, dayTime, pageUrl, providerNamer } from './format';
import { lookUpInTime } from './lookup';
import { PICK_GAME, PICK_STREAM, type AttachContext, type StreamChoice } from './questions';
import type { CommandContext, CommandDeps, CommandOutcome } from './types';

/** Pages offered when no game is on now. */
const NEAREST_PAGES = 4;

const ACTION = 'attach';

function choiceOf(stream: LiveStream, providerName: (provider: string) => string): StreamChoice {
  return {
    title: stream.title.trim().slice(0, 300),
    provider: providerName(stream.provider).slice(0, 60),
    startedAt: stream.startedAt ? stream.startedAt.toISOString() : null,
    streamUrl: stream.streamUrl,
  };
}

function optionLabel(text: string, fallback: string): string {
  return text.trim().slice(0, 160) || fallback;
}

function startedText(choice: StreamChoice, timeZone: string): string | null {
  return choice.startedAt ? clockTime(new Date(choice.startedAt), timeZone) : null;
}

async function ask(
  deps: Pick<CommandDeps, 'conversations' | 'newId'>,
  ctx: CommandContext,
  question: CoachTextQuestion
): Promise<void> {
  await deps.conversations.ask(ctx.text.from, {
    pendingId: deps.newId(),
    question,
    expiresAt: new Date(ctx.now.getTime() + questionTtlSeconds() * 1000),
  });
}

/** Which stream goes on this game. */
async function askStream(
  deps: Pick<CommandDeps, 'conversations' | 'newId'>,
  ctx: CommandContext,
  game: Pick<CoachGame, 'eventId' | 'title'>,
  choices: StreamChoice[]
): Promise<CommandOutcome> {
  const context: AttachContext = {
    linkId: ctx.link.linkId,
    streams: choices,
    eventId: game.eventId,
    gameTitle: game.title.slice(0, 300),
  };
  await ask(deps, ctx, {
    v: 1,
    kind: PICK_STREAM,
    options: choices.map((choice, index) => ({
      n: index + 1,
      label: optionLabel(choice.title, 'Untitled stream'),
      streamUrl: choice.streamUrl,
    })),
    context,
  });
  const listed: ListedOption[] = choices.map((choice, index) => {
    const started = startedText(choice, ctx.timeZone);
    return { n: index + 1, title: choice.title, detail: started ? `started ${started}` : undefined };
  });
  return { reply: replies.streamQuestion(game.title, listed), status: 'asked', reason: PICK_STREAM, action: ACTION };
}

/** Which game (or page, when none is on now) the stream goes on. */
async function askGame(
  deps: Pick<CommandDeps, 'conversations' | 'newId'>,
  ctx: CommandContext,
  games: CoachGame[],
  choices: StreamChoice[],
  onNow: boolean
): Promise<CommandOutcome> {
  const context: AttachContext = { linkId: ctx.link.linkId, streams: choices };
  await ask(deps, ctx, {
    v: 1,
    kind: PICK_GAME,
    options: games.map((game, index) => ({
      n: index + 1,
      label: optionLabel(game.title, 'Game'),
      eventId: game.eventId,
      directStreamId: game.directStreamId,
    })),
    context,
  });
  const listed: ListedOption[] = games.map((game, index) => ({
    n: index + 1,
    title: game.title,
    detail: game.scheduledStartAt
      ? onNow
        ? clockTime(game.scheduledStartAt, ctx.timeZone)
        : dayTime(game.scheduledStartAt, ctx.timeZone)
      : undefined,
  }));
  const reply = replies.gameQuestion({
    onNow,
    count: games.length,
    stream: choices.length === 1 ? choices[0].title || 'the stream' : null,
    options: listed,
  });
  return { reply, status: 'asked', reason: PICK_GAME, action: ACTION };
}

/** The guarded write, and the reply for each way it can end. */
async function write(
  deps: Pick<CommandDeps, 'writer'>,
  ctx: CommandContext,
  eventId: string,
  choice: StreamChoice
): Promise<CommandOutcome> {
  if (!isHttpsUrl(choice.streamUrl)) {
    return { reply: replies.pageGone(), status: 'rejected', reason: 'not_https', action: ACTION };
  }
  const result = await deps.writer.attach({
    commandId: ctx.commandId,
    ownerUserId: ctx.link.ownerUserId,
    ownerAccountId: ctx.link.ownerAccountId,
    eventId,
    streamUrl: choice.streamUrl,
    phoneE164: ctx.text.from,
    pendingId: ctx.pendingId,
    now: ctx.now,
    deadlineAtMs: ctx.deadline.atMs,
  });
  switch (result.kind) {
    case 'attached':
      return {
        reply: replies.attached({
          game: result.page.title,
          stream: choice.title,
          provider: choice.provider,
          startedAt: startedText(choice, ctx.timeZone),
          pageUrl: pageUrl(result.page),
        }),
        status: 'done',
        reason: 'attached',
        action: ACTION,
      };
    case 'same':
      return { reply: replies.alreadyShows(result.page.title), status: 'no_change', reason: 'same_stream', action: ACTION };
    case 'not_found':
      return { reply: replies.pageGone(), status: 'rejected', reason: 'page_gone', action: ACTION };
    case 'question_closed':
      return { reply: replies.questionClosedTryAgain(), status: 'rejected', reason: 'question_closed', action: ACTION };
    case 'changed':
      return { reply: replies.changedMeanwhile(), status: 'no_change', reason: 'changed_meanwhile', action: ACTION };
    case 'late':
      return { reply: replies.tooSlow(), status: 'timeout', reason: 'late', action: ACTION };
  }
}

/** ATTACH as a command: looks up what is live and follows the decision table. */
export async function runAttach(
  deps: Pick<CommandDeps, 'lookup' | 'games' | 'writer' | 'conversations' | 'newId'>,
  ctx: CommandContext
): Promise<CommandOutcome> {
  const lookup = await lookUpInTime(deps, ctx, ACTION);
  if ('slow' in lookup) {
    return lookup.slow;
  }
  const { found } = lookup;
  const games = await deps.games.listOnNow(ctx.link.ownerAccountId, ctx.now);
  const plan = planAttach({ games, streams: found.streams, now: ctx.now });
  const providerName = providerNamer(found.sources);
  const choices = (streams: LiveStream[]): StreamChoice[] => streams.map((s) => choiceOf(s, providerName));

  switch (plan.kind) {
    case 'nothing_live':
      return { reply: replies.nothingLive(found.sources), status: 'no_change', reason: 'nothing_live', action: ACTION };
    case 'attach':
      return write(deps, ctx, plan.game.eventId, choiceOf(plan.stream, providerName));
    case 'ask_stream':
      return askStream(deps, ctx, plan.game, choices(plan.streams));
    case 'ask_game':
      return askGame(deps, ctx, plan.games, choices(plan.streams), true);
    case 'no_game': {
      const pages = await deps.games.listNearest(ctx.link.ownerAccountId, ctx.now, NEAREST_PAGES);
      if (pages.length === 0) {
        return { reply: replies.noPages(), status: 'no_change', reason: 'no_pages', action: ACTION };
      }
      return askGame(deps, ctx, pages, choices(plan.streams), false);
    }
  }
}

/** A digit that picked the game: attach the one stream offered, or ask which. */
export async function answerGame(
  deps: Pick<CommandDeps, 'writer' | 'conversations' | 'newId'>,
  ctx: CommandContext & { pendingId: string },
  option: CoachTextQuestionOption & { eventId: string },
  context: AttachContext
): Promise<CommandOutcome> {
  if (context.streams.length === 1) {
    return write(deps, ctx, option.eventId, context.streams[0]);
  }
  // This answer is not a write, so it closes its question on its own.
  const won = await deps.conversations.answer(ctx.text.from, { pendingId: ctx.pendingId, now: ctx.now });
  if (!won) {
    return { reply: replies.questionClosedTryAgain(), status: 'rejected', reason: 'question_closed', action: ACTION };
  }
  const ordered = orderByMatch(context.streams, (choice) => choice.title, option.label);
  return askStream(deps, ctx, { eventId: option.eventId, title: option.label }, ordered);
}

/** A digit that picked the stream for the game chosen before. */
export async function answerStream(
  deps: Pick<CommandDeps, 'writer'>,
  ctx: CommandContext & { pendingId: string },
  option: CoachTextQuestionOption & { streamUrl: string },
  context: AttachContext & { eventId: string }
): Promise<CommandOutcome> {
  const choice = context.streams.find((candidate) => candidate.streamUrl === option.streamUrl) ?? {
    title: option.label,
    provider: 'the camera',
    startedAt: null,
    streamUrl: option.streamUrl,
  };
  return write(deps, ctx, context.eventId, choice);
}
