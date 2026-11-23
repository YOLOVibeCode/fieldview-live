/**
 * Coach text commands: the camera lookup, raced against the reply window.
 */

import { WRITE_MARGIN_MS } from '../config';
import { raceWithin } from '../deadline';
import type { OwnerLiveStreams } from '../interfaces';
import { replies } from '../reply/replies';

import type { CommandContext, CommandDeps, CommandOutcome } from './types';

/** The lookup when it came back in time, or the "still checking" outcome. */
export async function lookUpInTime(
  deps: Pick<CommandDeps, 'lookup'>,
  ctx: CommandContext,
  action: string
): Promise<{ found: OwnerLiveStreams } | { slow: CommandOutcome }> {
  const raced = await raceWithin(
    deps.lookup.find(ctx.link.ownerAccountId),
    ctx.deadline.remainingMs() - WRITE_MARGIN_MS
  );
  if (!raced.done) {
    return { slow: { reply: replies.cameraSlow(), status: 'timeout', reason: 'camera_slow', action } };
  }
  return { found: raced.value };
}
