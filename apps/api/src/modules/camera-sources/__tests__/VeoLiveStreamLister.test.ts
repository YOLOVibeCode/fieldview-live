import { describe, it, expect, vi } from 'vitest';

import { ConnectionExpiredError, type CameraConnection } from '../interfaces';
import { VeoLiveStreamLister } from '../providers/veo/VeoLiveStreamLister';
import type { IVeoAccessTokenProvider, IVeoStreamHistoryClient, VeoMatchRow } from '../providers/veo/types';

const CLUB_URL = 'https://app.veo.co/clubs/noctusoft-inc/live/streaming-diagnostics';

function connection(overrides: Partial<CameraConnection> = {}): CameraConnection {
  return {
    id: 'cs-1',
    ownerAccountId: 'owner-1',
    provider: 'veo',
    config: { email: 'coach@example.com', clubUrl: CLUB_URL },
    secrets: { sessionCookie: '_session=abc' },
    ...overrides,
  };
}

function row(overrides: Partial<VeoMatchRow> = {}): VeoMatchRow {
  return {
    matchName: 'Diablos vs Storm',
    status: 'live',
    streamUrl: 'https://stream.mux.com/LIVE1.m3u8',
    uploadSpeed: null,
    firmware: '3.9.8',
    ...overrides,
  };
}

function tokenProvider(...tokens: string[]) {
  let i = 0;
  return {
    getAccessToken: vi.fn(async () => tokens[Math.min(i++, tokens.length - 1)]),
    invalidate: vi.fn(),
  } satisfies IVeoAccessTokenProvider;
}

function setup(opts: { fetchLiveStreams: IVeoStreamHistoryClient['fetchLiveStreams']; tokens?: string[] }) {
  const provider = tokenProvider(...(opts.tokens ?? ['AT1']));
  const createTokenProvider = vi.fn(() => provider);
  const fetchLiveStreams = vi.fn(opts.fetchLiveStreams);
  const lister = new VeoLiveStreamLister({ streamClient: { fetchLiveStreams }, createTokenProvider });
  return { lister, provider, createTokenProvider, fetchLiveStreams };
}

describe('VeoLiveStreamLister', () => {
  it('returns live Veo rows as provider-neutral live streams', async () => {
    const { lister, fetchLiveStreams, createTokenProvider } = setup({ fetchLiveStreams: async () => [row()] });

    const streams = await lister.listLive(connection());

    expect(streams).toEqual([
      { provider: 'veo', title: 'Diablos vs Storm', streamUrl: 'https://stream.mux.com/LIVE1.m3u8' },
    ]);
    expect(createTokenProvider).toHaveBeenCalledWith('_session=abc');
    expect(fetchLiveStreams).toHaveBeenCalledWith('AT1', 'noctusoft-inc');
  });

  it('drops rows that have no playable URL', async () => {
    const { lister } = setup({ fetchLiveStreams: async () => [row({ streamUrl: null }), row()] });
    expect(await lister.listLive(connection())).toHaveLength(1);
  });

  it('keeps one token provider per connection across calls (token stays cached)', async () => {
    const { lister, createTokenProvider } = setup({ fetchLiveStreams: async () => [] });

    await lister.listLive(connection());
    await lister.listLive(connection());

    expect(createTokenProvider).toHaveBeenCalledTimes(1);
  });

  it('builds a new token provider when the stored cookie changes (after a reconnect)', async () => {
    const { lister, createTokenProvider } = setup({ fetchLiveStreams: async () => [] });

    await lister.listLive(connection());
    await lister.listLive(connection({ secrets: { sessionCookie: '_session=new' } }));

    expect(createTokenProvider).toHaveBeenCalledTimes(2);
    expect(createTokenProvider).toHaveBeenLastCalledWith('_session=new');
  });

  it('on a rejected token: invalidates, re-mints and retries once', async () => {
    let call = 0;
    const { lister, provider, fetchLiveStreams } = setup({
      tokens: ['STALE', 'FRESH'],
      fetchLiveStreams: async () => {
        call += 1;
        if (call === 1) throw new ConnectionExpiredError('401');
        return [row()];
      },
    });

    const streams = await lister.listLive(connection());

    expect(streams).toHaveLength(1);
    expect(provider.invalidate).toHaveBeenCalledTimes(1);
    expect(fetchLiveStreams).toHaveBeenNthCalledWith(1, 'STALE', 'noctusoft-inc');
    expect(fetchLiveStreams).toHaveBeenNthCalledWith(2, 'FRESH', 'noctusoft-inc');
  });

  it('raises ConnectionExpiredError when the retry is rejected too', async () => {
    const { lister, fetchLiveStreams } = setup({
      fetchLiveStreams: async () => {
        throw new ConnectionExpiredError('401');
      },
    });

    await expect(lister.listLive(connection())).rejects.toBeInstanceOf(ConnectionExpiredError);
    expect(fetchLiveStreams).toHaveBeenCalledTimes(2);
  });

  it('does not retry on errors that are not an expired credential', async () => {
    const { lister, fetchLiveStreams } = setup({
      fetchLiveStreams: async () => {
        throw new Error('HTTP 500');
      },
    });

    await expect(lister.listLive(connection())).rejects.toThrow('HTTP 500');
    expect(fetchLiveStreams).toHaveBeenCalledTimes(1);
  });

  it('raises ConnectionExpiredError when no session cookie is stored', async () => {
    const { lister, createTokenProvider } = setup({ fetchLiveStreams: async () => [] });

    await expect(lister.listLive(connection({ secrets: {} }))).rejects.toBeInstanceOf(ConnectionExpiredError);
    expect(createTokenProvider).not.toHaveBeenCalled();
  });

  it('fails clearly when the stored club URL has no club in it', async () => {
    const { lister } = setup({ fetchLiveStreams: async () => [] });

    await expect(
      lister.listLive(connection({ config: { clubUrl: 'https://app.veo.co/' } }))
    ).rejects.toThrow(/club/i);
  });
});
