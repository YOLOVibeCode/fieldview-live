/**
 * The owner's list of game pages: where the call goes, and what it carries.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/owners/direct-streams`;

function answer(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [string, RequestInit];
  return { url, init };
}

const page = {
  id: 'ds-1',
  slug: 'tigers-vs-hawks',
  title: 'Tigers vs Hawks',
  status: 'active',
  streamUrl: null,
  scheduledStartAt: null,
  paywallEnabled: true,
  priceInCents: 100,
  chatEnabled: true,
  scoreboardEnabled: false,
  listed: true,
  createdAt: '2026-11-22T12:00:00.000Z',
};

describe('owner direct streams client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('lists the active pages with the owner token', async () => {
    mockFetch.mockResolvedValue(answer({ streams: [page] }));

    const result = await apiClient.ownerDirectStreams('owner-jwt');

    expect(result).toEqual({ streams: [page] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}?status=active`);
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
  });

  it('can list every page, archived ones too', async () => {
    mockFetch.mockResolvedValue(answer({ streams: [] }));

    await apiClient.ownerDirectStreams('owner-jwt', 'all');

    expect(lastCall().url).toBe(`${BASE}?status=all`);
  });
});
