/**
 * LIVE: what is streaming on the account's cameras now, and what its games on
 * now show.
 */

import { replies, type LiveGameLine } from '../reply/replies';
import { isFresh, playableStreams } from '../resolve/GameResolver';

import { clockTime, providerNamer } from './format';
import { lookUpInTime } from './lookup';
import type { CommandContext, CommandDeps, CommandOutcome } from './types';

const STREAMS_SHOWN = 3;
const GAMES_SHOWN = 2;

export async function runLive(deps: Pick<CommandDeps, 'lookup' | 'games'>, ctx: CommandContext): Promise<CommandOutcome> {
  const lookup = await lookUpInTime(deps, ctx, 'live');
  if ('slow' in lookup) {
    return lookup.slow;
  }
  const { found } = lookup;
  const games = await deps.games.listOnNow(ctx.link.ownerAccountId, ctx.now);
  const streams = playableStreams(found.streams).sort(
    (a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
  );
  const providerName = providerNamer(found.sources);
  const fresh = streams.filter((stream) => isFresh(stream, ctx.now));

  const gameLines: LiveGameLine[] = games.slice(0, GAMES_SHOWN).map((game) => {
    const showing = streams.find((stream) => stream.streamUrl === game.streamUrl);
    return {
      title: game.title,
      shows: showing ? { kind: 'stream', title: showing.title } : game.streamUrl ? { kind: 'other' } : { kind: 'none' },
    };
  });
  const attachHint =
    fresh.length > 0 && games.some((game) => !fresh.some((stream) => stream.streamUrl === game.streamUrl));

  const reply = replies.live({
    streams: streams.slice(0, STREAMS_SHOWN).map((stream) => ({
      title: stream.title,
      provider: providerName(stream.provider),
      startedAt: stream.startedAt ? clockTime(stream.startedAt, ctx.timeZone) : null,
    })),
    more: Math.max(0, streams.length - STREAMS_SHOWN),
    nothingLive: streams.length === 0 ? replies.nothingLiveSentence(found.sources) : null,
    games: gameLines,
    attachHint,
  });
  return { reply, status: 'done', reason: streams.length === 0 ? 'nothing_live' : 'live', action: 'live' };
}
