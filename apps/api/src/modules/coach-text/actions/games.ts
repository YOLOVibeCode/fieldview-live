/**
 * GAMES: the account's pages on now and in the next 24 hours, up to five.
 */

import { replies } from '../reply/replies';
import { ON_NOW_AFTER_MS, ON_NOW_BEFORE_MS } from '../resolve/PrismaGameReader';

import { dayTime } from './format';
import type { CommandContext, CommandDeps, CommandOutcome } from './types';

const HOURS_AHEAD = 24;
const GAMES_SHOWN = 5;

export async function runGames(deps: Pick<CommandDeps, 'games'>, ctx: CommandContext): Promise<CommandOutcome> {
  const games = await deps.games.listUpcoming(ctx.link.ownerAccountId, ctx.now, HOURS_AHEAD, GAMES_SHOWN);
  const nowMs = ctx.now.getTime();
  const reply = replies.games(
    games.map((game) => {
      const startMs = game.scheduledStartAt?.getTime() ?? Number.NaN;
      return {
        title: game.title,
        when: game.scheduledStartAt ? dayTime(game.scheduledStartAt, ctx.timeZone) : 'no start time',
        onNow: startMs >= nowMs - ON_NOW_BEFORE_MS && startMs <= nowMs + ON_NOW_AFTER_MS,
        hasStream: game.streamUrl !== null && game.streamUrl !== '',
      };
    })
  );
  return { reply, status: 'done', reason: games.length === 0 ? 'no_games' : 'games', action: 'games' };
}
