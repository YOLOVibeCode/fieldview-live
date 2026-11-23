/**
 * The game reader only ever reads the account's own active pages.
 */
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { PrismaGameReader } from '../resolve/PrismaGameReader';

const NOW = new Date('2026-11-21T19:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function row(id: string, startAt: Date | null) {
  return {
    id,
    directStreamId: 'ds-1',
    title: `Game ${id}`,
    eventSlug: `game-${id}`,
    scheduledStartAt: startAt,
    streamUrl: null,
    directStream: { slug: 'diablos' },
  };
}

describe('PrismaGameReader', () => {
  it('reads games on now: from 3 hours ago to 60 minutes ahead, in the account only', async () => {
    const findMany = vi.fn().mockResolvedValue([row('1', NOW)]);
    const reader = new PrismaGameReader({ directStreamEvent: { findMany } } as unknown as PrismaClient);

    const games = await reader.listOnNow('account-1', NOW);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'active',
          directStream: { ownerAccountId: 'account-1', status: 'active' },
          scheduledStartAt: { gte: new Date(NOW.getTime() - 3 * HOUR), lte: new Date(NOW.getTime() + HOUR) },
        },
      })
    );
    expect(games).toEqual([
      {
        eventId: '1',
        directStreamId: 'ds-1',
        title: 'Game 1',
        parentSlug: 'diablos',
        eventSlug: 'game-1',
        scheduledStartAt: NOW,
        streamUrl: null,
      },
    ]);
  });

  it('reads the next 24 hours, at most five', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const reader = new PrismaGameReader({ directStreamEvent: { findMany } } as unknown as PrismaClient);

    await reader.listUpcoming('account-1', NOW, 24, 5);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        where: expect.objectContaining({
          directStream: { ownerAccountId: 'account-1', status: 'active' },
          scheduledStartAt: { gte: new Date(NOW.getTime() - 3 * HOUR), lte: new Date(NOW.getTime() + 24 * HOUR) },
        }) as object,
      })
    );
  });

  it('merges the pages before and after now, nearest first', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([row('ahead-1', new Date(NOW.getTime() + 5 * HOUR)), row('ahead-2', new Date(NOW.getTime() + 30 * HOUR))])
      .mockResolvedValueOnce([row('behind-1', new Date(NOW.getTime() - 4 * HOUR)), row('behind-2', new Date(NOW.getTime() - 48 * HOUR))]);
    const reader = new PrismaGameReader({ directStreamEvent: { findMany } } as unknown as PrismaClient);

    const games = await reader.listNearest('account-1', NOW, 3);

    expect(games.map((g) => g.eventId)).toEqual(['behind-1', 'ahead-1', 'ahead-2']);
    for (const call of findMany.mock.calls as Array<[{ where: { directStream: unknown } }]>) {
      expect(call[0].where.directStream).toEqual({ ownerAccountId: 'account-1', status: 'active' });
    }
  });
});
