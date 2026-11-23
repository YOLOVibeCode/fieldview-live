/**
 * UNLINK: takes this phone off the account the text is for. Every login of that
 * account that lists the phone lets go of it; other accounts keep it.
 */

import { replies } from '../reply/replies';

import type { CommandContext, CommandDeps, CommandOutcome } from './types';

export async function runUnlink(
  deps: Pick<CommandDeps, 'links' | 'linking'>,
  ctx: CommandContext
): Promise<CommandOutcome> {
  const proven = await deps.links.findVerifiedByPhone(ctx.text.from);
  const ofAccount = proven.filter((link) => link.owner.ownerAccountId === ctx.link.ownerAccountId);
  for (const link of ofAccount) {
    await deps.linking.removePhone(link.ownerUserId, link.id);
  }
  return { reply: replies.unlinked(), status: 'done', reason: 'unlinked', action: 'unlink', linkRemoved: true };
}
