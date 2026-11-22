/**
 * The owner text commands calls: where each one goes, and what it carries.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient } from '../api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/owners/me/text-commands`;
const PHONE_ID = '7d4f2b1e-8c3a-4e5f-9b6d-1a2c3e4f5a6b';

const CODE = {
  id: PHONE_ID,
  code: '482913',
  codeExpiresAt: '2026-11-21T18:10:00.000Z',
  productNumber: '+18773435308',
  smsHref: 'sms:+18773435308?&body=LINK%20482913',
};

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

  it('reads the status, with the list of phones, using the owner token', async () => {
    const status = {
      enabled: true,
      productNumber: '+18773435308',
      timeZone: 'America/Chicago',
      maxPhones: 10,
      phones: [],
      commands: [],
    };
    mockFetch.mockResolvedValue(answer(status));

    const result = await apiClient.ownerTextCommands('owner-jwt');

    expect(result).toEqual(status);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toBe(BASE);
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
  });

  it('adds a phone with the name and the number', async () => {
    mockFetch.mockResolvedValue(answer(CODE));

    const result = await apiClient.ownerTextCommandsAddPhone('owner-jwt', {
      label: 'Jordan',
      phone: '(214) 555-0142',
    });

    expect(result).toEqual(CODE);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/phones`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer owner-jwt',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({ label: 'Jordan', phone: '(214) 555-0142' });
  });

  it('asks for a new code for one phone', async () => {
    const renewed = { ...CODE, code: '771204', smsHref: 'sms:+18773435308?&body=LINK%20771204' };
    mockFetch.mockResolvedValue(answer(renewed));

    const result = await apiClient.ownerTextCommandsNewCode('owner-jwt', PHONE_ID);

    expect(result).toEqual(renewed);
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/phones/${PHONE_ID}/code`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
    expect(init.body).toBeUndefined();
  });

  it('never lets the browser keep an answer that carries a code', async () => {
    mockFetch.mockResolvedValue(answer(CODE));

    await apiClient.ownerTextCommandsAddPhone('owner-jwt', {
      label: 'Jordan',
      phone: '(214) 555-0142',
    });
    expect(lastCall().init.cache).toBe('no-store');

    await apiClient.ownerTextCommandsNewCode('owner-jwt', PHONE_ID);
    expect(lastCall().init.cache).toBe('no-store');
  });

  it('removes one phone', async () => {
    mockFetch.mockResolvedValue(answer({ removed: true }));

    const result = await apiClient.ownerTextCommandsRemovePhone('owner-jwt', PHONE_ID);

    expect(result).toEqual({ removed: true });
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/phones/${PHONE_ID}`);
    expect(init.method).toBe('DELETE');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer owner-jwt' });
    expect(init.body).toBeUndefined();
  });

  it('keeps a phone id inside its own part of the path', async () => {
    mockFetch.mockResolvedValue(answer({ removed: true }));
    await apiClient.ownerTextCommandsRemovePhone('owner-jwt', '../history?limit=1');
    expect(lastCall().url).toBe(`${BASE}/phones/..%2Fhistory%3Flimit%3D1`);

    mockFetch.mockResolvedValue(answer(CODE));
    await apiClient.ownerTextCommandsNewCode('owner-jwt', 'a b/c');
    expect(lastCall().url).toBe(`${BASE}/phones/a%20b%2Fc/code`);
  });

  it('no longer has the calls for one linked phone', () => {
    expect('ownerTextCommandsStartLink' in apiClient).toBe(false);
    expect('ownerTextCommandsUnlink' in apiClient).toBe(false);
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
      status: 409,
      json: () =>
        Promise.resolve({
          error: { code: 'PHONE_ALREADY_ADDED', message: 'That number is already linked here.' },
        }),
    });

    const failure = await apiClient
      .ownerTextCommandsAddPhone('owner-jwt', { label: 'Jordan', phone: '(214) 555-0142' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(409);
    expect((failure as ApiError).code).toBe('PHONE_ALREADY_ADDED');
    expect((failure as ApiError).message).toBe('That number is already linked here.');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
