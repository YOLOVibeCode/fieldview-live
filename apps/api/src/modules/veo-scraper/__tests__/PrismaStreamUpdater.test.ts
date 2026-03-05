/**
 * PrismaStreamUpdater tests (TDD — RED phase).
 * Mocked Prisma; verifies update and skip-if-same-URL logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaStreamUpdater } from '../implementations/PrismaStreamUpdater';
import type { StreamMatch, UpdateResult } from '../interfaces';

describe('PrismaStreamUpdater', () => {
  const mockUpdate = vi.fn();

  function createMockPrisma(): PrismaClient {
    return {
      directStreamEvent: {
        update: mockUpdate,
      },
    } as unknown as PrismaClient;
  }

  beforeEach(() => {
    mockUpdate.mockReset();
  });

  it('should update event streamUrl and return updated count', async () => {
    mockUpdate.mockResolvedValue({
      id: 'ev-1',
      eventSlug: 'soccer-varsity',
      streamUrl: 'https://stream.mux.com/new',
    });

    const updater = new PrismaStreamUpdater(createMockPrisma());
    const matches: StreamMatch[] = [
      {
        veoRow: {
          matchName: 'Match A',
          status: 'Live',
          streamUrl: 'https://stream.mux.com/new',
          uploadSpeed: 5,
          firmware: '1.0',
        },
        event: {
          eventId: 'ev-1',
          eventSlug: 'soccer-varsity',
          title: 'Match A',
          directStreamSlug: 'tchs',
          currentStreamUrl: null,
        },
        confidence: 0.9,
      },
    ];

    const result = await updater.updateStreamUrls(matches);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'ev-1' },
      data: { streamUrl: 'https://stream.mux.com/new' },
    });
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].eventSlug).toBe('soccer-varsity');
    expect(result.details[0].oldUrl).toBe(null);
    expect(result.details[0].newUrl).toBe('https://stream.mux.com/new');
  });

  it('should skip when currentStreamUrl equals new URL', async () => {
    const updater = new PrismaStreamUpdater(createMockPrisma());
    const url = 'https://stream.mux.com/same';
    const matches: StreamMatch[] = [
      {
        veoRow: {
          matchName: 'Match A',
          status: 'Live',
          streamUrl: url,
          uploadSpeed: 5,
          firmware: '1.0',
        },
        event: {
          eventId: 'ev-1',
          eventSlug: 'soccer-varsity',
          title: 'Match A',
          directStreamSlug: 'tchs',
          currentStreamUrl: url,
        },
        confidence: 0.9,
      },
    ];

    const result = await updater.updateStreamUrls(matches);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].eventSlug).toBe('soccer-varsity');
    expect(result.details[0].oldUrl).toBe(url);
    expect(result.details[0].newUrl).toBe(url);
  });

  it('should return empty details when no matches', async () => {
    const updater = new PrismaStreamUpdater(createMockPrisma());
    const result = await updater.updateStreamUrls([]);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.details).toEqual([]);
  });

  it('should update multiple events and report correct counts', async () => {
    mockUpdate
      .mockResolvedValueOnce({ id: 'ev-1', eventSlug: 'a', streamUrl: 'https://stream.mux.com/1' })
      .mockResolvedValueOnce({ id: 'ev-2', eventSlug: 'b', streamUrl: 'https://stream.mux.com/2' });

    const updater = new PrismaStreamUpdater(createMockPrisma());
    const matches: StreamMatch[] = [
      {
        veoRow: {
          matchName: 'A',
          status: 'Live',
          streamUrl: 'https://stream.mux.com/1',
          uploadSpeed: 5,
          firmware: '1.0',
        },
        event: {
          eventId: 'ev-1',
          eventSlug: 'a',
          title: 'A',
          directStreamSlug: 'tchs',
          currentStreamUrl: null,
        },
        confidence: 0.9,
      },
      {
        veoRow: {
          matchName: 'B',
          status: 'Live',
          streamUrl: 'https://stream.mux.com/2',
          uploadSpeed: 5,
          firmware: '1.0',
        },
        event: {
          eventId: 'ev-2',
          eventSlug: 'b',
          title: 'B',
          directStreamSlug: 'tchs',
          currentStreamUrl: 'https://stream.mux.com/old',
        },
        confidence: 0.85,
      },
    ];

    const result = await updater.updateStreamUrls(matches);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(result.updated).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.details).toHaveLength(2);
  });
});
