/**
 * UNDO: puts back the account's last change made by text, from any of its
 * phones, within 30 minutes. A page someone changed since is left alone.
 */

import { replies } from '../reply/replies';

import type { CommandContext, CommandDeps, CommandOutcome } from './types';

export async function runUndo(deps: Pick<CommandDeps, 'writer'>, ctx: CommandContext): Promise<CommandOutcome> {
  const result = await deps.writer.undo({
    commandId: ctx.commandId,
    ownerUserId: ctx.link.ownerUserId,
    ownerAccountId: ctx.link.ownerAccountId,
    now: ctx.now,
    deadlineAtMs: ctx.deadline.atMs,
  });
  switch (result.kind) {
    case 'undone':
      return { reply: replies.undone(result.page.title), status: 'done', reason: 'undone', action: 'undo' };
    case 'changed':
      return {
        reply: replies.undoChangedSince(result.page.title),
        status: 'no_change',
        reason: 'changed_since',
        action: 'undo',
      };
    case 'late':
      return { reply: replies.tooSlow(), status: 'timeout', reason: 'late', action: 'undo' };
    default:
      return { reply: replies.nothingToUndo(), status: 'no_change', reason: 'nothing_to_undo', action: 'undo' };
  }
}
