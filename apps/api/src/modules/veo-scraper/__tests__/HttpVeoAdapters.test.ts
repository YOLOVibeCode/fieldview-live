import { describe, it, expect, vi } from 'vitest';

import { HttpVeoAuthenticator } from '../implementations/HttpVeoAuthenticator';
import { HttpVeoStreamScraper } from '../implementations/HttpVeoStreamScraper';
import {
  VeoSessionExpiredError,
  type IVeoAccessTokenProvider,
  type IVeoStreamHistoryClient,
  type VeoMatchRow,
} from '../interfaces';

const DIAG = 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';
const ROW: VeoMatchRow = { matchName: 'A vs B', status: 'live', streamUrl: 'https://stream.mux.com/X.m3u8', uploadSpeed: null, firmware: '' };

describe('HttpVeoAuthenticator', () => {
  it('login builds a session carrying a token provider from the seeded cookie', async () => {
    const provider: IVeoAccessTokenProvider = { getAccessToken: vi.fn(async () => 'AT') };
    const createTokenProvider = vi.fn(() => provider);
    const auth = new HttpVeoAuthenticator({ createTokenProvider });

    const session = await auth.login({ email: '', password: '', sessionCookie: '_session=abc' });
    expect(createTokenProvider).toHaveBeenCalledWith('_session=abc');
    expect((session.context as any).provider).toBe(provider);
    await expect(auth.logout(session)).resolves.toBeUndefined(); // no-op, no browser to close
  });

  it('login without a seeded session cookie fails clearly', async () => {
    const auth = new HttpVeoAuthenticator({ createTokenProvider: vi.fn() });
    await expect(auth.login({ email: 'x', password: 'y' })).rejects.toThrow(/session cookie/i);
  });
});

function sessionWith(provider: IVeoAccessTokenProvider) {
  return { context: { provider } };
}

describe('HttpVeoStreamScraper', () => {
  it('resolves club slug + token, then returns the client rows', async () => {
    const provider: IVeoAccessTokenProvider = { getAccessToken: vi.fn(async () => 'AT') };
    const client: IVeoStreamHistoryClient = { fetchLiveStreams: vi.fn(async () => [ROW]) };
    const rows = await new HttpVeoStreamScraper({ streamClient: client }).scrape(sessionWith(provider), DIAG);
    expect(client.fetchLiveStreams).toHaveBeenCalledWith('AT', 'noctusoft-inc');
    expect(rows).toEqual([ROW]);
  });

  it('on a 401 (expired access token) it invalidates, re-mints, and retries once', async () => {
    const invalidate = vi.fn();
    const provider = { getAccessToken: vi.fn().mockResolvedValueOnce('OLD').mockResolvedValueOnce('NEW'), invalidate } as IVeoAccessTokenProvider & { invalidate: any };
    const fetchLiveStreams = vi
      .fn()
      .mockRejectedValueOnce(new VeoSessionExpiredError('401'))
      .mockResolvedValueOnce([ROW]);
    const rows = await new HttpVeoStreamScraper({ streamClient: { fetchLiveStreams } }).scrape(sessionWith(provider), DIAG);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(fetchLiveStreams).toHaveBeenNthCalledWith(1, 'OLD', 'noctusoft-inc');
    expect(fetchLiveStreams).toHaveBeenNthCalledWith(2, 'NEW', 'noctusoft-inc');
    expect(rows).toEqual([ROW]);
  });

  it('propagates VeoSessionExpiredError when the re-mint also fails (cookie truly dead)', async () => {
    const provider = {
      getAccessToken: vi.fn().mockResolvedValueOnce('OLD').mockRejectedValueOnce(new VeoSessionExpiredError()),
      invalidate: vi.fn(),
    } as IVeoAccessTokenProvider & { invalidate: any };
    const fetchLiveStreams = vi.fn().mockRejectedValueOnce(new VeoSessionExpiredError('401'));
    await expect(
      new HttpVeoStreamScraper({ streamClient: { fetchLiveStreams } }).scrape(sessionWith(provider), DIAG)
    ).rejects.toBeInstanceOf(VeoSessionExpiredError);
  });

  it('throws if the diagnostics URL has no club slug', async () => {
    const provider: IVeoAccessTokenProvider = { getAccessToken: vi.fn(async () => 'AT') };
    const client: IVeoStreamHistoryClient = { fetchLiveStreams: vi.fn() };
    await expect(
      new HttpVeoStreamScraper({ streamClient: client }).scrape(sessionWith(provider), 'https://app.veo.co/recordings')
    ).rejects.toThrow(/club/i);
  });
});
