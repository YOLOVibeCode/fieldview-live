/**
 * Veo calls end at a timeout. A hung call used to hold a coach's text, the admin
 * search and the poller for as long as the socket stayed open.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HttpResponse } from '../interfaces';
import { cameraSourceHttpTimeoutMs, withHttpTimeout } from '../providers/veo';

type BaseFetch = (url: string, init?: { signal?: AbortSignal }) => Promise<HttpResponse>;

describe('withHttpTimeout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ends a call that never answers at the timeout', async () => {
    const hung: BaseFetch = () => new Promise<HttpResponse>(() => undefined);
    const fetch = withHttpTimeout(hung, () => 30);

    const started = Date.now();
    await expect(fetch('https://app.veo.co/api/x')).rejects.toThrow(/timed out after 30 ms/);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('hands the call an abort signal that fires at the timeout', async () => {
    let seen: AbortSignal | undefined;
    const base: BaseFetch = (_url, init) => {
      seen = init?.signal;
      return new Promise<HttpResponse>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted by signal')));
      });
    };

    await expect(withHttpTimeout(base, () => 20)('https://app.veo.co/api/x')).rejects.toThrow();
    expect(seen?.aborted).toBe(true);
  });

  it('passes the answer through when it comes in time', async () => {
    const response = { status: 200 } as HttpResponse;
    const base = vi.fn<Parameters<BaseFetch>, ReturnType<BaseFetch>>().mockResolvedValue(response);

    const answer = await withHttpTimeout(base, () => 1000)('https://app.veo.co/api/x', {
      method: 'POST',
      headers: { a: 'b' },
    });

    expect(answer).toBe(response);
    expect(base).toHaveBeenCalledWith(
      'https://app.veo.co/api/x',
      expect.objectContaining({ method: 'POST', headers: { a: 'b' }, signal: expect.any(AbortSignal) as AbortSignal })
    );
  });

  it('reads CAMERA_SOURCE_HTTP_TIMEOUT_MS, 8000 by default', () => {
    vi.stubEnv('CAMERA_SOURCE_HTTP_TIMEOUT_MS', '');
    expect(cameraSourceHttpTimeoutMs()).toBe(8000);
    vi.stubEnv('CAMERA_SOURCE_HTTP_TIMEOUT_MS', '2500');
    expect(cameraSourceHttpTimeoutMs()).toBe(2500);
    vi.stubEnv('CAMERA_SOURCE_HTTP_TIMEOUT_MS', 'soon');
    expect(cameraSourceHttpTimeoutMs()).toBe(8000);
  });
});
