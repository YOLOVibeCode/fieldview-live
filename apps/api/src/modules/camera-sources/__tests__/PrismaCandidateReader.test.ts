/**
 * PrismaCandidateReader: the camera poller's candidates. A page whose stream URL a
 * person pinned is never a candidate, so the poller cannot overwrite it.
 */

import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { PrismaCandidateReader } from '../matching/PrismaCandidateReader';

describe('PrismaCandidateReader', () => {
  it('reads only active, unpinned pages of the owner account', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'ev-1',
        eventSlug: 'game-1',
        title: 'Game 1',
        streamUrl: null,
        directStream: { slug: 'tchs' },
      },
    ]);
    const reader = new PrismaCandidateReader({ directStreamEvent: { findMany } } as unknown as PrismaClient);

    const candidates = await reader.getCandidates('owner-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { directStream: { ownerAccountId: 'owner-1' }, status: 'active', streamUrlPinnedAt: null },
      include: { directStream: { select: { slug: true } } },
    });
    expect(candidates).toEqual([
      { eventId: 'ev-1', eventSlug: 'game-1', title: 'Game 1', directStreamSlug: 'tchs', currentStreamUrl: null },
    ]);
  });
});
