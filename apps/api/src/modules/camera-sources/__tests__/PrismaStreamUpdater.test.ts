/**
 * PrismaStreamUpdater tests.
 * Mocked Prisma; verifies the guarded write, skip-if-same-URL, and that a page a
 * person pinned, or whose URL changed since it was read, is never overwritten.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaStreamUpdater } from '../matching/PrismaStreamUpdater';
import type { StreamMatch, UpdateResult } from '../interfaces';

describe('PrismaStreamUpdater', () => {
  const mockUpdate = vi.fn();

  function createMockPrisma(): PrismaClient {
    return {
      directStreamEvent: {
        updateMany: mockUpdate,
      },
    } as unknown as PrismaClient;
  }

  beforeEach(() => {
    mockUpdate.mockReset();
  });

  it('should update event streamUrl and return updated count', async () => {
    mockUpdate.mockResolvedValue({ count: 1 });

    const updater = new PrismaStreamUpdater(createMockPrisma());
    const matches: StreamMatch[] = [
      {
        stream: {
          provider: 'veo',
          title: 'Match A',
          streamUrl: 'https://stream.mux.com/new',
          startedAt: null,
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
      where: { id: 'ev-1', streamUrl: null, streamUrlPinnedAt: null },
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
        stream: {
          provider: 'veo',
          title: 'Match A',
          streamUrl: url,
          startedAt: null,
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
    mockUpdate.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });

    const updater = new PrismaStreamUpdater(createMockPrisma());
    const matches: StreamMatch[] = [
      {
        stream: {
          provider: 'veo',
          title: 'A',
          streamUrl: 'https://stream.mux.com/1',
          startedAt: null,
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
        stream: {
          provider: 'veo',
          title: 'B',
          streamUrl: 'https://stream.mux.com/2',
          startedAt: null,
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

  it('counts a page as skipped when a person pinned it or its URL changed after it was read', async () => {
    mockUpdate.mockResolvedValue({ count: 0 });

    const updater = new PrismaStreamUpdater(createMockPrisma());
    const result = await updater.updateStreamUrls([
      {
        stream: { provider: 'veo', title: 'A', streamUrl: 'https://stream.mux.com/new', startedAt: null },
        event: {
          eventId: 'ev-1',
          eventSlug: 'a',
          title: 'A',
          directStreamSlug: 'tchs',
          currentStreamUrl: 'https://stream.mux.com/old',
        },
        confidence: 0.9,
      },
    ]);

    // The write is guarded on the URL it read and on no pin, so the coach's choice stays.
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'ev-1', streamUrl: 'https://stream.mux.com/old', streamUrlPinnedAt: null },
      data: { streamUrl: 'https://stream.mux.com/new' },
    });
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.details).toEqual([]);
  });
});
