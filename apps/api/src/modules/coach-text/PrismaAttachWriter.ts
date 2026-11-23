/**
 * Coach text commands: changing a game's stream, on Prisma.
 *
 * One short transaction per change. It consumes the open question (when the
 * text answers one), records the change on the text's log row, and writes the
 * page last. The page write is an `updateMany` filtered on the page id, its
 * status, the URL that was read and the account read from the login on this
 * text, and it must hit exactly one row; anything else rolls everything back.
 * `DirectStreamEventService.updateEvent` is not used: it has no owner check.
 *
 * The deadline is checked before the transaction and again before the page
 * write, so no change goes out with a reply the coach will never see.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

import { UNDO_WINDOW_MS } from './config';
import type {
  AttachResult,
  AttachWrite,
  AttachedPage,
  IAttachWriter,
  UndoResult,
  UndoWrite,
} from './interfaces';

/** The change is a few small statements; it must never hold rows for long. */
const TRANSACTION_OPTIONS = { maxWait: 2_000, timeout: 3_000 } as const;

const PAGE_SELECT = {
  title: true,
  eventSlug: true,
  streamUrl: true,
  streamUrlPinnedAt: true,
  directStream: { select: { slug: true } },
} satisfies Prisma.DirectStreamEventSelect;

type PageRow = Prisma.DirectStreamEventGetPayload<{ select: typeof PAGE_SELECT }>;

/** Thrown inside a transaction to roll it back; mapped to a result outside. */
class Stop extends Error {
  constructor(readonly result: AttachResult | UndoResult) {
    super(result.kind);
  }
}

function pageOf(row: PageRow): AttachedPage {
  return { title: row.title, parentSlug: row.directStream.slug, eventSlug: row.eventSlug };
}

export class PrismaAttachWriter implements IAttachWriter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly nowMs: () => number = (): number => Date.now()
  ) {}

  async attach(input: AttachWrite): Promise<AttachResult> {
    if (this.nowMs() >= input.deadlineAtMs) {
      return { kind: 'late' };
    }
    try {
      return await this.prisma.$transaction(async (tx): Promise<AttachResult> => {
        if (input.pendingId) {
          const consumed = await tx.coachTextPhone.updateMany({
            where: { phoneE164: input.phoneE164, pendingId: input.pendingId, pendingExpiresAt: { gt: input.now } },
            data: { pendingId: null, pendingQuestion: Prisma.DbNull, pendingExpiresAt: null },
          });
          if (consumed.count !== 1) {
            return { kind: 'question_closed' };
          }
        }

        const page = await tx.directStreamEvent.findFirst({
          where: {
            id: input.eventId,
            status: 'active',
            directStream: { ownerAccountId: input.ownerAccountId, status: 'active' },
          },
          select: PAGE_SELECT,
        });
        if (!page) {
          return { kind: 'not_found' };
        }
        if (page.streamUrl === input.streamUrl) {
          return { kind: 'same', page: pageOf(page) };
        }

        await tx.coachTextCommand.update({
          where: { id: input.commandId },
          data: {
            action: 'attach',
            status: 'done',
            reason: 'attached',
            ownerUserId: input.ownerUserId,
            ownerAccountId: input.ownerAccountId,
            targetEventId: input.eventId,
            previousStreamUrl: page.streamUrl,
            previousPinnedAt: page.streamUrlPinnedAt,
            newStreamUrl: input.streamUrl,
          },
        });

        if (this.nowMs() >= input.deadlineAtMs) {
          throw new Stop({ kind: 'late' });
        }
        // Last, so nothing above can leave a changed page behind.
        const written = await tx.directStreamEvent.updateMany({
          where: {
            id: input.eventId,
            status: 'active',
            streamUrl: page.streamUrl,
            directStream: { ownerAccountId: input.ownerAccountId },
          },
          data: { streamUrl: input.streamUrl, streamUrlPinnedAt: input.now },
        });
        if (written.count !== 1) {
          throw new Stop({ kind: 'changed' });
        }
        return { kind: 'attached', page: pageOf(page) };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (error instanceof Stop) {
        return error.result as AttachResult;
      }
      throw error;
    }
  }

  async undo(input: UndoWrite): Promise<UndoResult> {
    if (this.nowMs() >= input.deadlineAtMs) {
      return { kind: 'late' };
    }
    try {
      return await this.prisma.$transaction(async (tx): Promise<UndoResult> => {
        const last = await tx.coachTextCommand.findFirst({
          where: {
            ownerAccountId: input.ownerAccountId,
            action: 'attach',
            status: 'done',
            createdAt: { gte: new Date(input.now.getTime() - UNDO_WINDOW_MS) },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            targetEventId: true,
            previousStreamUrl: true,
            previousPinnedAt: true,
            newStreamUrl: true,
          },
        });
        if (!last || last.reason !== 'attached' || !last.targetEventId || !last.newStreamUrl) {
          return { kind: 'nothing' };
        }

        const page = await tx.directStreamEvent.findFirst({
          where: { id: last.targetEventId, directStream: { ownerAccountId: input.ownerAccountId } },
          select: PAGE_SELECT,
        });
        if (!page) {
          return { kind: 'nothing' };
        }

        // Claims the change, so two UNDO texts cannot both put it back.
        const claimed = await tx.coachTextCommand.updateMany({
          where: { id: last.id, reason: 'attached' },
          data: { reason: 'undone' },
        });
        if (claimed.count !== 1) {
          return { kind: 'nothing' };
        }

        await tx.coachTextCommand.update({
          where: { id: input.commandId },
          data: {
            action: 'undo',
            ownerUserId: input.ownerUserId,
            ownerAccountId: input.ownerAccountId,
            targetEventId: last.targetEventId,
            previousStreamUrl: last.newStreamUrl,
            previousPinnedAt: page.streamUrlPinnedAt,
            newStreamUrl: last.previousStreamUrl,
            args: { undoOf: last.id },
          },
        });

        if (this.nowMs() >= input.deadlineAtMs) {
          throw new Stop({ kind: 'late' });
        }
        // A compare-and-swap on the URL the bot wrote: a page changed since is left alone.
        const written = await tx.directStreamEvent.updateMany({
          where: {
            id: last.targetEventId,
            streamUrl: last.newStreamUrl,
            directStream: { ownerAccountId: input.ownerAccountId },
          },
          data: { streamUrl: last.previousStreamUrl, streamUrlPinnedAt: last.previousPinnedAt },
        });
        if (written.count !== 1) {
          throw new Stop({ kind: 'changed', page: pageOf(page) });
        }
        return { kind: 'undone', page: pageOf(page) };
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (error instanceof Stop) {
        return error.result as UndoResult;
      }
      throw error;
    }
  }
}
