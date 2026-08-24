import { describe, it, expect, vi } from 'vitest';

import { HttpVeoStreamHistoryClient } from '../implementations/HttpVeoStreamHistoryClient';
import { DEFAULT_VEO_OIDC } from '../implementations/veo-oidc';
import { VeoSessionExpiredError, type FetchLike, type HttpResponse } from '../interfaces';

const SAMPLE = {
  result: [
    { additional_info: { home_team: 'A', away_team: 'B', status: 'finished', broadcast_link: 'https://stream.mux.com/OLD.m3u8' } },
    { additional_info: { home_team: 'Live FC', away_team: 'Now United', status: 'live', broadcast_link: 'https://stream.mux.com/LIVE.m3u8' } },
    { additional_info: { home_team: 'No URL', away_team: 'Yet', status: 'live', broadcast_link: '' } },
  ],
};

function resp(status: number, json: unknown): HttpResponse {
  return { status, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) };
}

describe('HttpVeoStreamHistoryClient', () => {
  it('GETs stream-history with the Bearer token and returns only LIVE rows with a URL', async () => {
    const calls: Array<{ url: string; init?: any }> = [];
    const fetch: FetchLike = vi.fn(async (url, init) => {
      calls.push({ url, init });
      return resp(200, SAMPLE);
    });
    const rows = await new HttpVeoStreamHistoryClient({ fetch }).fetchLiveStreams('AT-1', 'noctusoft-inc');

    expect(calls[0].url).toBe(`${DEFAULT_VEO_OIDC.streamHistoryBase}/noctusoft-inc/stream-history`);
    expect(calls[0].init.headers.Authorization).toBe('Bearer AT-1');
    // finished dropped, empty-url dropped → only the one live+playable row
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ matchName: 'Live FC vs Now United', status: 'live', streamUrl: 'https://stream.mux.com/LIVE.m3u8' });
  });

  it('treats 401 as an expired token → VeoSessionExpiredError (caller re-mints)', async () => {
    const fetch: FetchLike = async () => resp(401, { error: 'invalid_token' });
    await expect(new HttpVeoStreamHistoryClient({ fetch }).fetchLiveStreams('AT', 'noctusoft-inc')).rejects.toBeInstanceOf(
      VeoSessionExpiredError
    );
  });

  it('treats 403 (no diagnostics access to that club) as no live streams (empty)', async () => {
    const fetch: FetchLike = async () => resp(403, { detail: 'forbidden' });
    const rows = await new HttpVeoStreamHistoryClient({ fetch }).fetchLiveStreams('AT', 'some-club');
    expect(rows).toEqual([]);
  });

  it('throws on other non-2xx responses', async () => {
    const fetch: FetchLike = async () => resp(500, { error: 'boom' });
    await expect(new HttpVeoStreamHistoryClient({ fetch }).fetchLiveStreams('AT', 'c')).rejects.toThrow(/500/);
  });
});
