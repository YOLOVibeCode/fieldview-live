/**
 * Coach text commands: the inbound text path.
 *
 * The webhook hands every inbound text here before the viewer path. The engine
 * acts only on a text the relay verified from a phone a login has proven, and
 * answers `{ handled: false }` for everything else, so a text from anyone else
 * gets the same answer it always got.
 *
 * Every text, in order:
 *    1. Preconditions: the switch, the relay secret, the verified header, a message id.
 *    2. LINK <code>: handled by the link service.
 *    3. The phone's proven links. None, or a failed lookup, is not handled.
 *    4. A word shaped like a viewer keyword that is a real keyword goes to the
 *       viewer path. ATTACH always wins.
 *    5. Checks: allowlist (off it: not handled), paused (an empty reply), link
 *       expired or account off (a one-line reply).
 *    6. The log row, unique on the message id. A duplicate gets an empty reply.
 *    7. The phone's lease. Another text holding it gets "Still working".
 *    8. A digit (or NO, N, NONE for 0) answers the open question.
 *    9. The rules read the text, else "I did not understand that."
 *   10. The account is resolved, the command runs, the reply is built.
 *   11. The log row gets its outcome; the lease is released.
 *
 * Commands: MENU, LIVE, GAMES, ATTACH, UNDO, UNLINK, ACCOUNT, and LINK <code>.
 */

import { randomUUID } from 'crypto';

import {
  COACH_TEXT_MAX_ACCOUNTS_PER_PHONE,
  CoachTextQuestionSchema,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  type CoachTextQuestion,
  type CoachTextQuestionOption,
} from '@fieldview/data-model';

import { logger } from '../../lib/logger';
import { maskPhoneE164 } from '../../lib/phone';

import { answerGame, answerStream, runAttach } from './actions/attach';
import { clockTime } from './actions/format';
import { runGames } from './actions/games';
import { runLive } from './actions/live';
import { runMenu } from './actions/menu';
import {
  AccountContextSchema,
  AttachContextSchema,
  PICK_ACCOUNT,
  PICK_GAME,
  PICK_STREAM,
} from './actions/questions';
import type { CommandContext, CommandDeps, CommandOutcome } from './actions/types';
import { runUndo } from './actions/undo';
import { runUnlink } from './actions/unlink';
import { maskLinkText, parseLinkText } from './codes';
import {
  LEASE_MS,
  MAX_UNVERIFIED_NOTES_PER_HOUR,
  accountChoiceHours,
  defaultTimeZone,
  isCoachTextEnabled,
  isOwnerAllowed,
  questionTtlSeconds,
  replyBudgetMs,
} from './config';
import { Deadline } from './deadline';
import type {
  CoachTextLinkRecord,
  CoachTextResult,
  FinishCommandInput,
  IAccountChooser,
  IAttachWriter,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  ICoachTextConsent,
  ICoachTextConversationStore,
  ICoachTextEngine,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  ICoachTextSettingsStore,
  ICommandInterpreter,
  IGameReader,
  IKeywordLookup,
  ILiveLookup,
  InboundText,
  Intent,
  IPhoneLinkInbound,
  IPhoneLinkPortal,
  LiveLink,
} from './interfaces';
import { RulesInterpreter, normalizeText } from './interpret/RulesInterpreter';
import { replies } from './reply/replies';
import { emptyTwiml, toSmsText, twimlMessage } from './reply/twiml';
import { isIdle, mayUse } from './rules';

const HOUR_MS = 60 * 60 * 1000;
const ACCOUNT_WORD = 'ACCOUNT';
/** The log keeps this much of a text. */
const STORED_BODY_LENGTH = 500;
/** Words that answer a question with 0, "none of these". The bot never asks for them. */
const NONE_WORDS = new Set(['NO', 'N', 'NONE']);
/** Six characters from the game keyword alphabet, or a DIRECT- code. */
const KEYWORD_SHAPE = /^(?:[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}|DIRECT-\S+)$/;

export interface CoachTextEngineDeps {
  linking: IPhoneLinkInbound & Pick<IPhoneLinkPortal, 'removePhone'>;
  links: Pick<ICoachTextLinkReader, 'isKnownPhone' | 'findVerifiedByPhone'> &
    Pick<ICoachTextLinkWriter, 'touchLastCommand'>;
  commands: ICoachTextCommandWriter & Pick<ICoachTextCommandReader, 'countUnverifiedSince' | 'previousFor'>;
  chooser: IAccountChooser;
  conversations: ICoachTextConversationStore;
  settings: Pick<ICoachTextSettingsStore, 'getTimeZone'>;
  /** Reads the phone's viewer opt-out: a STOP sent while the switch was off still pauses. */
  consent: Pick<ICoachTextConsent, 'getByPhoneAndPurpose'>;
  keywords: IKeywordLookup;
  games: IGameReader;
  lookup: ILiveLookup;
  writer: IAttachWriter;
  interpreter?: ICommandInterpreter;
  now?: () => Date;
  /** Makes the id of each question asked. */
  newId?: () => string;
}

/** What step 5 decided. */
type Gate =
  | { kind: 'not_handled' }
  | { kind: 'paused' }
  | { kind: 'refused'; reply: string; reason: string }
  | { kind: 'go'; live: LiveLink[] };

/** One text past the checks, holding its phone's lease. */
interface Run {
  text: InboundText;
  /** Upper case, no end punctuation. */
  word: string;
  commandId: string;
  /** The phone's live links, one per account. */
  live: LiveLink[];
  now: Date;
  deadline: Deadline;
}

/** A command's outcome, with the link it acted for and how to name the account. */
interface Dispatched {
  outcome: CommandOutcome;
  link?: LiveLink;
  /** Name the account at the start of the reply; `auto` says why it was picked. */
  name?: { auto: boolean };
}

/**
 * The `x-relay-twilio-verified` header can be trusted only when the relay's
 * own signature was checked, and that check needs the shared secret.
 */
function isOn(): boolean {
  return isCoachTextEnabled() && (process.env.RELAY_INBOUND_SECRET ?? '').trim().length > 0;
}

function handledWith(reply: string): CoachTextResult {
  return { handled: true, twiml: twimlMessage(reply) };
}

export class CoachTextEngine implements ICoachTextEngine {
  private readonly deps: CoachTextEngineDeps;
  private readonly interpreter: ICommandInterpreter;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(deps: CoachTextEngineDeps) {
    this.deps = deps;
    this.interpreter = deps.interpreter ?? new RulesInterpreter();
    this.now = deps.now ?? ((): Date => new Date());
    this.newId = deps.newId ?? ((): string => randomUUID());
  }

  async handleInbound(text: InboundText): Promise<CoachTextResult> {
    try {
      // 1. Preconditions.
      if (!isOn()) {
        return { handled: false };
      }
      if (!text.twilioVerified || text.messageSid === null) {
        await this.noteUnverified(text);
        return { handled: false };
      }
      // 2. LINK <code>.
      const code = parseLinkText(text.body);
      if (code !== null) {
        return await this.handleLink(text, text.messageSid, code);
      }
      return await this.handleCommandText(text, text.messageSid);
    } catch (error) {
      logger.warn(
        { error, phone: maskPhoneE164(text.from) },
        'Coach text handling failed; the text goes to the viewer path'
      );
      return { handled: false };
    }
  }

  async handleOptOut(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void> {
    if (!isOn() || !text.twilioVerified) {
      return;
    }
    try {
      await this.deps.linking.pause(text.from);
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text pause on STOP failed');
    }
  }

  async handleOptIn(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void> {
    if (!isOn() || !text.twilioVerified) {
      return;
    }
    try {
      await this.deps.linking.resume(text.from);
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text resume on START failed');
    }
  }

  async hintForYes(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<string | null> {
    if (!isOn() || !text.twilioVerified) {
      return null;
    }
    try {
      const live = await this.deps.chooser.listLive(text.from);
      if (live.length === 0) {
        return null;
      }
      const conversation = await this.deps.conversations.get(text.from);
      const open =
        conversation?.pendingId && conversation.pendingExpiresAt
          ? conversation.pendingExpiresAt.getTime() > this.now().getTime()
          : false;
      return open ? replies.yesHint() : null;
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text YES hint failed');
      return null;
    }
  }

  // ── LINK <code> ───────────────────────────────────────────────────────────

  private async handleLink(text: InboundText, messageSid: string, code: string): Promise<CoachTextResult> {
    const begun = await this.deps.commands.begin({
      messageSid,
      phoneE164: text.from,
      body: maskLinkText(),
      interpreter: 'link',
    });
    if (begun === 'duplicate') {
      // The same text, delivered again. It was answered the first time.
      return { handled: true, twiml: emptyTwiml() };
    }

    try {
      const outcome = await this.deps.linking.completeFromText({ from: text.from, code });

      if (!outcome.matched) {
        const reply =
          outcome.reason === 'too_many_accounts'
            ? replies.linkTooManyAccounts(COACH_TEXT_MAX_ACCOUNTS_PER_PHONE)
            : replies.linkNoMatch();
        await this.close(begun.id, text, { status: 'rejected', reason: outcome.reason, replyText: toSmsText(reply) });
        return handledWith(reply);
      }

      // A paused phone texted STOP before, so no text may go back to it.
      let reply: string | null = null;
      if (!outcome.paused) {
        reply =
          outcome.accountCount > 1
            ? replies.linkedToo(outcome.accountName, outcome.accountCount)
            : replies.linked(outcome.accountName);
      }
      await this.close(begun.id, text, {
        status: 'done',
        reason: outcome.paused ? 'linked_paused' : 'linked',
        replyText: reply === null ? null : toSmsText(reply),
        ownerUserId: outcome.ownerUserId,
        ownerAccountId: outcome.ownerAccountId,
        phoneLabel: outcome.label,
      });
      return reply === null ? { handled: true, twiml: emptyTwiml() } : handledWith(reply);
    } catch (error) {
      await this.close(begun.id, text, { status: 'failed', reason: 'error' });
      throw error;
    }
  }

  // ── Every other text from a proven phone ──────────────────────────────────

  private async handleCommandText(text: InboundText, messageSid: string): Promise<CoachTextResult> {
    // 3. The phone's proven links.
    const proven = await this.deps.links.findVerifiedByPhone(text.from);
    if (proven.length === 0) {
      return { handled: false };
    }

    // 4. A linked coach may also be a parent texting a game keyword.
    if (await this.isViewerKeyword(text.body)) {
      return { handled: false };
    }

    // 5. Checks.
    const gate = await this.gate(text.from, proven);
    if (gate.kind === 'not_handled') {
      return { handled: false };
    }

    // 6. The log row.
    const word = normalizeText(text.body);
    const begun = await this.deps.commands.begin({
      messageSid,
      phoneE164: text.from,
      body: text.body.slice(0, STORED_BODY_LENGTH),
      interpreter: isAnswerWord(word) ? 'answer' : 'rules',
    });
    if (begun === 'duplicate') {
      return { handled: true, twiml: emptyTwiml() };
    }
    if (gate.kind === 'paused') {
      // The phone texted STOP: nothing may go back to it.
      await this.close(begun.id, text, { status: 'rejected', reason: 'paused' });
      return { handled: true, twiml: emptyTwiml() };
    }
    if (gate.kind === 'refused') {
      await this.close(begun.id, text, { status: 'rejected', reason: gate.reason, replyText: toSmsText(gate.reply) });
      return handledWith(gate.reply);
    }

    // 7. The lease.
    const now = this.now();
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    if (!(await this.deps.conversations.acquireLease(text.from, now, leaseUntil))) {
      const reply = replies.stillWorking();
      await this.close(begun.id, text, { status: 'rejected', reason: 'busy', replyText: toSmsText(reply) });
      return handledWith(reply);
    }

    let dispatched: Dispatched;
    let timedOutBefore = false;
    try {
      timedOutBefore = await this.previousTimedOut(text.from, begun.id);
      const run: Run = {
        text,
        word,
        commandId: begun.id,
        live: gate.live,
        now,
        deadline: new Deadline(text.receivedAtMs, replyBudgetMs(), () => this.now().getTime()),
      };
      // 8 to 10.
      dispatched = await this.dispatch(run);
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text command failed');
      dispatched = { outcome: { reply: replies.failed(), status: 'failed', reason: 'error', action: 'none' } };
    } finally {
      await this.quietly('release the lease', () => this.deps.conversations.releaseLease(text.from, leaseUntil));
    }

    // 11. Finish.
    let reply = dispatched.outcome.reply;
    if (reply !== null && dispatched.link && dispatched.name) {
      reply = replies.forAccount(reply, dispatched.link.accountName, dispatched.name.auto);
    }
    if (reply !== null && timedOutBefore) {
      reply = replies.afterTimeout(reply);
    }
    await this.close(begun.id, text, {
      status: dispatched.outcome.status,
      reason: dispatched.outcome.reason,
      action: dispatched.outcome.action,
      replyText: reply === null ? null : toSmsText(reply),
      ...(dispatched.link ? this.ownerOf(dispatched.link) : {}),
    });
    if (dispatched.link && !dispatched.outcome.linkRemoved) {
      const linkId = dispatched.link.linkId;
      await this.quietly('mark the link used', () => this.deps.links.touchLastCommand(linkId, now));
    }
    return reply === null ? { handled: true, twiml: emptyTwiml() } : handledWith(reply);
  }

  /** Step 4. ATTACH is the only command with a keyword's shape, and it always wins. */
  private async isViewerKeyword(body: string): Promise<boolean> {
    const word = body.trim().toUpperCase();
    if (word === 'ATTACH' || !KEYWORD_SHAPE.test(word)) {
      return false;
    }
    return this.deps.keywords.isKeyword(word);
  }

  /** Step 5. */
  private async gate(phoneE164: string, proven: CoachTextLinkRecord[]): Promise<Gate> {
    const allowed = proven.filter((link) => isOwnerAllowed(link.owner.ownerAccountId));
    if (allowed.length === 0) {
      return { kind: 'not_handled' };
    }
    // A STOP sent while the switch was off revoked the viewer opt-in but never
    // reached the links. It still means: send nothing.
    const viewerConsent = await this.deps.consent.getByPhoneAndPurpose(phoneE164, SMS_PURPOSE_VIEWER_NOTIFICATIONS);
    if (viewerConsent?.revokedAt) {
      return { kind: 'paused' };
    }
    const live = await this.deps.chooser.listLive(phoneE164);
    if (live.length > 0) {
      return { kind: 'go', live };
    }
    if (allowed.some((link) => link.pausedAt !== null)) {
      return { kind: 'paused' };
    }
    const now = this.now();
    if (allowed.some((link) => mayUse(link.owner) && isIdle(link, now))) {
      return { kind: 'refused', reply: replies.linkExpired(), reason: 'link_expired' };
    }
    return { kind: 'refused', reply: replies.accountOff(), reason: 'account_off' };
  }

  private async previousTimedOut(phoneE164: string, commandId: string): Promise<boolean> {
    const previous = await this.deps.commands.previousFor(phoneE164, commandId);
    return previous !== null && (previous.status === 'timeout' || previous.status === 'received');
  }

  // ── Steps 8 to 10 ─────────────────────────────────────────────────────────

  private async dispatch(run: Run): Promise<Dispatched> {
    if (isAnswerWord(run.word)) {
      return this.answer(run, NONE_WORDS.has(run.word) ? 0 : Number(run.word));
    }
    if (run.word === ACCOUNT_WORD) {
      return this.account(run);
    }
    const intent = await this.interpreter.interpret(run.text.body);
    if (!intent) {
      return { outcome: { reply: replies.notUnderstood(), status: 'not_understood', reason: 'rules', action: 'none' } };
    }
    return this.command(run, intent);
  }

  /** A command: resolve the account first, then run it. */
  private async command(run: Run, intent: Intent): Promise<Dispatched> {
    // Any command closes the question still open.
    await this.closeOpenQuestion(run);

    const resolution = await this.deps.chooser.resolve(run.text.from);
    switch (resolution.kind) {
      case 'none':
        return { outcome: { reply: replies.accountOff(), status: 'rejected', reason: 'account_off', action: intent.action } };
      case 'one':
        return this.runIntent(run, intent, resolution.link, null);
      case 'chosen':
        return this.runIntent(run, intent, resolution.link, null, { auto: false });
      case 'ask': {
        if (intent.action === 'menu') {
          return { outcome: runMenu(true) };
        }
        if (intent.action !== 'unlink') {
          const picked = await this.autoPick(resolution.options, run.now);
          if (picked) {
            return this.runIntent(run, intent, picked, null, { auto: true });
          }
        }
        return this.askAccount(run, resolution.options, intent);
      }
    }
  }

  /** The one account of several that has a game on now, if exactly one has. */
  private async autoPick(options: LiveLink[], now: Date): Promise<LiveLink | null> {
    const withGames: LiveLink[] = [];
    for (const link of options) {
      if ((await this.deps.games.listOnNow(link.ownerAccountId, now)).length > 0) {
        withGames.push(link);
      }
    }
    return withGames.length === 1 ? withGames[0] : null;
  }

  private async runIntent(
    run: Run,
    intent: Intent,
    link: LiveLink,
    pendingId: string | null,
    name?: { auto: boolean }
  ): Promise<Dispatched> {
    const ctx = await this.contextFor(run, link, pendingId);
    const deps = this.commandDeps();
    let outcome: CommandOutcome;
    switch (intent.action) {
      case 'menu':
        outcome = runMenu(run.live.length > 1);
        break;
      case 'live':
        outcome = await runLive(deps, ctx);
        break;
      case 'games':
        outcome = await runGames(deps, ctx);
        break;
      case 'attach':
        outcome = await runAttach(deps, ctx);
        break;
      case 'undo':
        outcome = await runUndo(deps, ctx);
        break;
      case 'unlink':
        outcome = await runUnlink(deps, ctx);
        break;
    }
    return { outcome, link, name: this.nameFor(run, name) };
  }

  /** Name the account when the phone works with several. */
  private nameFor(run: Run, name?: { auto: boolean }): { auto: boolean } | undefined {
    if (run.live.length < 2) {
      return undefined;
    }
    return name ?? { auto: false };
  }

  private async contextFor(run: Run, link: LiveLink, pendingId: string | null): Promise<CommandContext> {
    const timeZone = (await this.deps.settings.getTimeZone(link.ownerUserId)) ?? defaultTimeZone();
    return { text: run.text, commandId: run.commandId, link, timeZone, now: run.now, deadline: run.deadline, pendingId };
  }

  private commandDeps(): CommandDeps {
    return {
      games: this.deps.games,
      lookup: this.deps.lookup,
      writer: this.deps.writer,
      conversations: this.deps.conversations,
      linking: this.deps.linking,
      links: this.deps.links,
      newId: this.newId,
    };
  }

  // ── ACCOUNT, and the account question ─────────────────────────────────────

  private async account(run: Run): Promise<Dispatched> {
    if (run.live.length === 1) {
      const [only] = run.live;
      return {
        outcome: {
          reply: replies.accountOnlyOne(only.accountName),
          status: 'no_change',
          reason: 'one_account',
          action: 'account',
        },
        link: only,
      };
    }
    const conversation = await this.deps.conversations.get(run.text.from);
    const current =
      conversation?.chosenUntil && conversation.chosenUntil.getTime() > run.now.getTime()
        ? conversation.chosenLinkId
        : null;
    return this.askAccount(run, run.live, null, current);
  }

  /** "Which account?" Asked before a command, the question keeps the command to run after it. */
  private async askAccount(
    run: Run,
    options: LiveLink[],
    command: Intent | null,
    current: string | null = null
  ): Promise<Dispatched> {
    const question: CoachTextQuestion = {
      v: 1,
      kind: PICK_ACCOUNT,
      options: options.map((link, index) => ({
        n: index + 1,
        label: link.accountName.slice(0, 160) || 'Account',
        linkId: link.linkId,
      })),
      ...(command ? { context: { command } } : {}),
    };
    await this.deps.conversations.ask(run.text.from, {
      pendingId: this.newId(),
      question,
      expiresAt: new Date(run.now.getTime() + questionTtlSeconds() * 1000),
    });
    const reply = replies.accountQuestion(
      options.map((link, index) => ({
        n: index + 1,
        accountName: link.accountName,
        current: link.linkId === current,
      }))
    );
    // The text is for no one account yet, so it sits in no login's history.
    return { outcome: { reply, status: 'asked', reason: PICK_ACCOUNT, action: command?.action ?? 'account' } };
  }

  // ── Step 8: a digit answers the open question ─────────────────────────────

  private async answer(run: Run, digit: number): Promise<Dispatched> {
    const conversation = await this.deps.conversations.get(run.text.from);
    const pendingId = conversation?.pendingId;
    if (!conversation || !pendingId) {
      return { outcome: { reply: replies.noOpenQuestion(), status: 'rejected', reason: 'no_question', action: 'answer' } };
    }
    if (!conversation.pendingExpiresAt || conversation.pendingExpiresAt.getTime() <= run.now.getTime()) {
      return {
        outcome: { reply: replies.questionExpired(), status: 'rejected', reason: 'question_expired', action: 'answer' },
      };
    }
    const parsed = CoachTextQuestionSchema.safeParse(conversation.pendingQuestion);
    if (!parsed.success) {
      return { outcome: { reply: replies.noOpenQuestion(), status: 'rejected', reason: 'no_question', action: 'answer' } };
    }
    const question = parsed.data;
    const isAccountOnly = question.kind === PICK_ACCOUNT && !AccountContextSchema.safeParse(question.context).success;

    if (digit === 0) {
      const won = await this.deps.conversations.answer(run.text.from, { pendingId, now: run.now });
      if (!won) {
        const reply = question.kind === PICK_ACCOUNT ? replies.questionClosed() : replies.questionClosedTryAgain();
        return { outcome: { reply, status: 'rejected', reason: 'question_closed', action: 'answer' } };
      }
      const reply = isAccountOnly ? replies.nothingChanged() : replies.answeredNone();
      return { outcome: { reply, status: 'no_change', reason: 'none_of_these', action: 'answer' } };
    }

    const option = question.options.find((candidate) => candidate.n === digit);
    if (!option) {
      // The question stays open for a number from the list.
      return {
        outcome: {
          reply: replies.answerNotAnOption(question.options.length),
          status: 'not_understood',
          reason: 'not_an_option',
          action: 'answer',
        },
      };
    }

    switch (question.kind) {
      case PICK_ACCOUNT:
        return this.answerAccount(run, question, option, pendingId);
      case PICK_GAME:
      case PICK_STREAM:
        return this.answerAttach(run, question, option, pendingId);
      default:
        return { outcome: { reply: replies.noOpenQuestion(), status: 'rejected', reason: 'no_question', action: 'answer' } };
    }
  }

  private async answerAccount(
    run: Run,
    question: CoachTextQuestion,
    option: CoachTextQuestionOption,
    pendingId: string
  ): Promise<Dispatched> {
    const link = run.live.find((candidate) => candidate.linkId === option.linkId);
    if (!link) {
      await this.deps.conversations.answer(run.text.from, { pendingId, now: run.now });
      return { outcome: { reply: replies.accountGone(), status: 'rejected', reason: 'account_gone', action: 'answer' } };
    }
    const context = AccountContextSchema.safeParse(question.context);
    const command = context.success ? context.data.command : null;

    // Unlinking is no reason to keep texting for that account.
    const until = new Date(run.now.getTime() + accountChoiceHours() * HOUR_MS);
    const choose = command?.action === 'unlink' ? undefined : { linkId: link.linkId, until };
    const won = await this.deps.conversations.answer(run.text.from, { pendingId, now: run.now, choose });
    if (!won) {
      return {
        outcome: { reply: replies.questionClosed(), status: 'rejected', reason: 'question_closed', action: 'answer' },
      };
    }

    if (command) {
      return this.runIntent(run, command, link, null, { auto: false });
    }
    const timeZone = (await this.deps.settings.getTimeZone(link.ownerUserId)) ?? defaultTimeZone();
    return {
      outcome: {
        reply: replies.accountChosen(link.accountName, clockTime(until, timeZone)),
        status: 'done',
        reason: 'account_chosen',
        action: 'account',
      },
      link,
    };
  }

  private async answerAttach(
    run: Run,
    question: CoachTextQuestion,
    option: CoachTextQuestionOption,
    pendingId: string
  ): Promise<Dispatched> {
    const context = AttachContextSchema.safeParse(question.context);
    if (!context.success) {
      return { outcome: { reply: replies.noOpenQuestion(), status: 'rejected', reason: 'no_question', action: 'answer' } };
    }
    const link = run.live.find((candidate) => candidate.linkId === context.data.linkId);
    if (!link) {
      await this.deps.conversations.answer(run.text.from, { pendingId, now: run.now });
      return { outcome: { reply: replies.accountGone(), status: 'rejected', reason: 'account_gone', action: 'answer' } };
    }
    const ctx = { ...(await this.contextFor(run, link, pendingId)), pendingId };
    const deps = this.commandDeps();
    let outcome: CommandOutcome | null = null;
    if (question.kind === PICK_GAME && option.eventId) {
      outcome = await answerGame(deps, ctx, { ...option, eventId: option.eventId }, context.data);
    } else if (question.kind === PICK_STREAM && option.streamUrl && context.data.eventId) {
      outcome = await answerStream(
        deps,
        ctx,
        { ...option, streamUrl: option.streamUrl },
        { ...context.data, eventId: context.data.eventId }
      );
    }
    if (!outcome) {
      return { outcome: { reply: replies.noOpenQuestion(), status: 'rejected', reason: 'no_question', action: 'answer' } };
    }
    return { outcome, link, name: this.nameFor(run) };
  }

  private async closeOpenQuestion(run: Run): Promise<void> {
    const conversation = await this.deps.conversations.get(run.text.from);
    if (conversation?.pendingId) {
      await this.deps.conversations.answer(run.text.from, { pendingId: conversation.pendingId, now: run.now });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private ownerOf(link: LiveLink): Pick<FinishCommandInput, 'ownerUserId' | 'ownerAccountId' | 'phoneLabel'> {
    return { ownerUserId: link.ownerUserId, ownerAccountId: link.ownerAccountId, phoneLabel: link.label };
  }

  /** Closes the log row. The reply matters more than the row, so a failure is only logged. */
  private async close(id: string, text: InboundText, input: Omit<FinishCommandInput, 'latencyMs'>): Promise<void> {
    try {
      await this.deps.commands.finish(id, { ...input, latencyMs: this.latency(text) });
    } catch (error) {
      logger.warn({ error, commandId: id }, 'Coach text log row could not be closed');
    }
  }

  private async quietly(what: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      logger.warn({ error }, `Coach text could not ${what}`);
    }
  }

  /**
   * Lets the portal say "a text arrived but could not be verified". Notes only
   * phones a login knows, and only a few an hour, so strangers cannot fill the log.
   */
  private async noteUnverified(text: InboundText): Promise<void> {
    if (!(await this.deps.links.isKnownPhone(text.from))) {
      return;
    }
    const since = new Date(this.now().getTime() - HOUR_MS);
    const noted = await this.deps.commands.countUnverifiedSince(text.from, since);
    if (noted >= MAX_UNVERIFIED_NOTES_PER_HOUR) {
      return;
    }
    await this.deps.commands.recordUnverified({
      phoneE164: text.from,
      twilioVerified: text.twilioVerified,
      reason: text.twilioVerified ? 'no_message_sid' : 'unverified',
    });
  }

  private latency(text: InboundText): number {
    return Math.max(0, this.now().getTime() - text.receivedAtMs);
  }
}

/** A single digit, or a word that means 0. */
function isAnswerWord(word: string): boolean {
  return /^\d$/.test(word) || NONE_WORDS.has(word);
}
