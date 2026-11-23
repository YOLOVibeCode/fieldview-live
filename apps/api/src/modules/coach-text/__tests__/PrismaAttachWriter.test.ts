/**
 * The guarded write: scoped to the account, exactly one row, inside one short
 * transaction with consuming the question and the log row, the page write last.
 */
import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaAttachWriter } from '../PrismaAttachWriter';
import type { AttachWrite, UndoWrite } from '../interfaces';

const NOW = new Date('2026-11-21T19:00:00.000Z');
const OLD_URL = 'https://stream.example.com/old.m3u8';
const NEW_URL = 'https://stream.example.com/new.m3u8';
const PINNED_BEFORE = new Date('2026-11-21T17:00:00.000Z');
const PAGE = { title: 'Diablos vs Sporting', eventSlug: 'diablos-vs-sporting', directStream: { slug: 'diablos' } };

function makeTx() {
  return {
    coachTextPhone: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    directStreamEvent: {
      findFirst: vi.fn().mockResolvedValue({ ...PAGE, streamUrl: OLD_URL, streamUrlPinnedAt: PINNED_BEFORE }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    coachTextCommand: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

type Tx = ReturnType<typeof makeTx>;

describe('PrismaAttachWriter', () => {
  let tx: Tx;
  let order: string[];
  let clockMs: number;
  let writer: PrismaAttachWriter;
  const transaction = vi.fn();

  beforeEach(() => {
    tx = makeTx();
    order = [];
    clockMs = NOW.getTime();
    for (const [model, methods] of Object.entries(tx)) {
      for (const [name, fn] of Object.entries(methods as Record<string, ReturnType<typeof vi.fn>>)) {
        const original = fn.getMockImplementation();
        fn.mockImplementation((...args: unknown[]) => {
          order.push(`${model}.${name}`);
          return original ? original(...args) : undefined;
        });
      }
    }
    transaction.mockReset().mockImplementation(async (fn: (client: Tx) => Promise<unknown>) => {
      // A rejected callback is what rolls the transaction back.
      return fn(tx);
    });
    writer = new PrismaAttachWriter({ $transaction: transaction } as unknown as PrismaClient, () => clockMs);
  });

  const attachInput = (overrides: Partial<AttachWrite> = {}): AttachWrite => ({
    commandId: 'cmd-1',
    ownerUserId: 'user-1',
    ownerAccountId: 'account-1',
    eventId: 'ev-1',
    streamUrl: NEW_URL,
    phoneE164: '+12145550100',
    pendingId: null,
    now: NOW,
    deadlineAtMs: NOW.getTime() + 5_000,
    ...overrides,
  });

  describe('attach', () => {
    it('writes the page last, guarded on the account, the status and the URL it read, and pins it', async () => {
      const result = await writer.attach(attachInput({ pendingId: 'q-1' }));

      expect(result).toEqual({
        kind: 'attached',
        page: { title: 'Diablos vs Sporting', parentSlug: 'diablos', eventSlug: 'diablos-vs-sporting' },
      });
      expect(tx.coachTextPhone.updateMany).toHaveBeenCalledWith({
        where: { phoneE164: '+12145550100', pendingId: 'q-1', pendingExpiresAt: { gt: NOW } },
        data: expect.objectContaining({ pendingId: null, pendingExpiresAt: null }) as object,
      });
      expect(tx.directStreamEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ev-1', status: 'active', directStream: { ownerAccountId: 'account-1', status: 'active' } },
        })
      );
      expect(tx.coachTextCommand.update).toHaveBeenCalledWith({
        where: { id: 'cmd-1' },
        data: {
          action: 'attach',
          status: 'done',
          reason: 'attached',
          ownerUserId: 'user-1',
          ownerAccountId: 'account-1',
          targetEventId: 'ev-1',
          previousStreamUrl: OLD_URL,
          previousPinnedAt: PINNED_BEFORE,
          newStreamUrl: NEW_URL,
        },
      });
      expect(tx.directStreamEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'ev-1', status: 'active', streamUrl: OLD_URL, directStream: { ownerAccountId: 'account-1' } },
        data: { streamUrl: NEW_URL, streamUrlPinnedAt: NOW },
      });
      expect(order.at(-1)).toBe('directStreamEvent.updateMany');
      expect(transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ timeout: expect.any(Number) as number }));
    });

    it('writes nothing for a page of another account', async () => {
      tx.directStreamEvent.findFirst.mockResolvedValue(null);

      expect(await writer.attach(attachInput())).toEqual({ kind: 'not_found' });
      expect(tx.directStreamEvent.updateMany).not.toHaveBeenCalled();
      expect(tx.coachTextCommand.update).not.toHaveBeenCalled();
    });

    it('rolls back when the guarded write does not hit exactly one row', async () => {
      tx.directStreamEvent.updateMany.mockResolvedValue({ count: 0 });

      expect(await writer.attach(attachInput())).toEqual({ kind: 'changed' });
    });

    it('says so when the page already shows that stream, and writes nothing', async () => {
      tx.directStreamEvent.findFirst.mockResolvedValue({ ...PAGE, streamUrl: NEW_URL, streamUrlPinnedAt: null });

      const result = await writer.attach(attachInput());

      expect(result.kind).toBe('same');
      expect(tx.directStreamEvent.updateMany).not.toHaveBeenCalled();
    });

    it('acts on no answer that lost the race for its question', async () => {
      tx.coachTextPhone.updateMany.mockResolvedValue({ count: 0 });

      expect(await writer.attach(attachInput({ pendingId: 'q-1' }))).toEqual({ kind: 'question_closed' });
      expect(tx.directStreamEvent.findFirst).not.toHaveBeenCalled();
      expect(tx.directStreamEvent.updateMany).not.toHaveBeenCalled();
    });

    it('starts no write after the deadline', async () => {
      clockMs = NOW.getTime() + 6_000;

      expect(await writer.attach(attachInput())).toEqual({ kind: 'late' });
      expect(transaction).not.toHaveBeenCalled();
    });

    it('stops inside the transaction when the deadline passes during it', async () => {
      tx.directStreamEvent.findFirst.mockImplementation(() => {
        clockMs = NOW.getTime() + 6_000;
        return Promise.resolve({ ...PAGE, streamUrl: OLD_URL, streamUrlPinnedAt: null });
      });

      expect(await writer.attach(attachInput())).toEqual({ kind: 'late' });
      expect(tx.directStreamEvent.updateMany).not.toHaveBeenCalled();
    });

    it('passes on any other failure', async () => {
      tx.directStreamEvent.findFirst.mockRejectedValue(new Error('db down'));

      await expect(writer.attach(attachInput())).rejects.toThrow('db down');
    });
  });

  describe('undo', () => {
    const undoInput = (overrides: Partial<UndoWrite> = {}): UndoWrite => ({
      commandId: 'cmd-2',
      ownerUserId: 'user-2',
      ownerAccountId: 'account-1',
      now: NOW,
      deadlineAtMs: NOW.getTime() + 5_000,
      ...overrides,
    });

    const lastAttach = {
      id: 'cmd-1',
      reason: 'attached',
      targetEventId: 'ev-1',
      previousStreamUrl: OLD_URL,
      previousPinnedAt: PINNED_BEFORE,
      newStreamUrl: NEW_URL,
    };

    beforeEach(() => {
      tx.coachTextCommand.findFirst.mockResolvedValue(lastAttach);
      tx.directStreamEvent.findFirst.mockResolvedValue({ ...PAGE, streamUrl: NEW_URL, streamUrlPinnedAt: NOW });
    });

    it("restores the earlier URL and pin of the account's last change by text in 30 minutes", async () => {
      const result = await writer.undo(undoInput());

      expect(result).toEqual({
        kind: 'undone',
        page: { title: 'Diablos vs Sporting', parentSlug: 'diablos', eventSlug: 'diablos-vs-sporting' },
      });
      expect(tx.coachTextCommand.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerAccountId: 'account-1',
            action: 'attach',
            status: 'done',
            createdAt: { gte: new Date(NOW.getTime() - 30 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        })
      );
      expect(tx.coachTextCommand.updateMany).toHaveBeenCalledWith({
        where: { id: 'cmd-1', reason: 'attached' },
        data: { reason: 'undone' },
      });
      expect(tx.directStreamEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'ev-1', streamUrl: NEW_URL, directStream: { ownerAccountId: 'account-1' } },
        data: { streamUrl: OLD_URL, streamUrlPinnedAt: PINNED_BEFORE },
      });
      expect(tx.coachTextCommand.update).toHaveBeenCalledWith({
        where: { id: 'cmd-2' },
        data: expect.objectContaining({
          action: 'undo',
          targetEventId: 'ev-1',
          previousStreamUrl: NEW_URL,
          newStreamUrl: OLD_URL,
          args: { undoOf: 'cmd-1' },
        }) as object,
      });
      expect(order.at(-1)).toBe('directStreamEvent.updateMany');
    });

    it('finds nothing to undo when there is no recent change, or it was undone already', async () => {
      tx.coachTextCommand.findFirst.mockResolvedValue(null);
      expect(await writer.undo(undoInput())).toEqual({ kind: 'nothing' });

      tx.coachTextCommand.findFirst.mockResolvedValue({ ...lastAttach, reason: 'undone' });
      expect(await writer.undo(undoInput())).toEqual({ kind: 'nothing' });

      tx.coachTextCommand.findFirst.mockResolvedValue(lastAttach);
      tx.coachTextCommand.updateMany.mockResolvedValue({ count: 0 });
      expect(await writer.undo(undoInput())).toEqual({ kind: 'nothing' });

      expect(tx.directStreamEvent.updateMany).not.toHaveBeenCalled();
    });

    it('leaves the page alone when it was changed after the text', async () => {
      tx.directStreamEvent.updateMany.mockResolvedValue({ count: 0 });

      const result = await writer.undo(undoInput());

      expect(result).toEqual({
        kind: 'changed',
        page: { title: 'Diablos vs Sporting', parentSlug: 'diablos', eventSlug: 'diablos-vs-sporting' },
      });
    });

    it('starts no write after the deadline', async () => {
      clockMs = NOW.getTime() + 6_000;

      expect(await writer.undo(undoInput())).toEqual({ kind: 'late' });
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
