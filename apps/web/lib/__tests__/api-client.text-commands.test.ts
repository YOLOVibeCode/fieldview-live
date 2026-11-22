/**
 * The owner text commands calls: where each one goes, and what it carries.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient } from '../api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/owners/me/text-commands`;

function answer(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) };
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [
    string,
    RequestInit,
  ];
  return { url, init };
}

describe('owner text commands client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('reads the status with the owner token', async () => {
    mockFetch.mockResolvedValue(answer({ enabled: true, state: 'none' }));

    const result = await apiClient.ownerTextCommands('owner-jwt');

    expect(result).toEqual({ enabled: true, state: 'none' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toBe(BASE);
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
  });

  it('asks for a link code with the phone and the time zone', async () => {
    const started = {
      code: '482913',
      codeExpiresAt: '2026-11-21T18:10:00.000Z',
      productNumber: '+18773435308',
      smsHref: 'sms:+18773435308?&body=LINK%20482913',
    };
    mockFetch.mockResolvedValue(answer(started));

    const result = await apiClient.ownerTextCommandsStartLink('owner-jwt', {
      phone: '(214) 555-0100',
      timeZone: 'America/Denver',
    });

    expect(result).toEqual(started);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/link`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer owner-jwt',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({
      phone: '(214) 555-0100',
      timeZone: 'America/Denver',
    });
  });

  it('never lets the browser keep the answer that carries the code', async () => {
    mockFetch.mockResolvedValue(answer({ code: '482913' }));

    await apiClient.ownerTextCommandsStartLink('owner-jwt', { phone: '(214) 555-0100' });

    const { init } = lastCall();
    expect(init.cache).toBe('no-store');
    expect(JSON.parse(String(init.body))).toEqual({ phone: '(214) 555-0100' });
  });

  it('unlinks the phone', async () => {
    mockFetch.mockResolvedValue(answer({ unlinked: true }));

    const result = await apiClient.ownerTextCommandsUnlink('owner-jwt');

    expect(result).toEqual({ unlinked: true });
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/link`);
    expect(init.method).toBe('DELETE');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
    expect(init.body).toBeUndefined();
  });

  it('changes the time zone', async () => {
    mockFetch.mockResolvedValue(answer({ enabled: true, timeZone: 'America/New_York' }));

    const result = await apiClient.ownerTextCommandsSetTimeZone('owner-jwt', 'America/New_York');

    expect(result).toEqual({ enabled: true, timeZone: 'America/New_York' });
    const { url, init } = lastCall();
    expect(url).toBe(BASE);
    expect(init.method).toBe('PATCH');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
    expect(JSON.parse(String(init.body))).toEqual({ timeZone: 'America/New_York' });
  });

  it('reads the recent texts, with a limit only when one is given', async () => {
    mockFetch.mockResolvedValue(answer({ items: [] }));

    expect(await apiClient.ownerTextCommandsHistory('owner-jwt')).toEqual({ items: [] });
    expect(lastCall().url).toBe(`${BASE}/history`);
    expect(lastCall().init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });

    await apiClient.ownerTextCommandsHistory('owner-jwt', 5);
    expect(lastCall().url).toBe(`${BASE}/history?limit=5`);
  });

  it('passes on why the API turned a request down', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: { code: 'RATE_LIMIT', message: 'Too many link codes. Try again later.' },
        }),
    });

    const failure = await apiClient
      .ownerTextCommandsStartLink('owner-jwt', { phone: '(214) 555-0100' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(429);
    expect((failure as ApiError).message).toBe('Too many link codes. Try again later.');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
