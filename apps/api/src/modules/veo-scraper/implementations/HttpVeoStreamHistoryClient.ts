/**
 * HttpVeoStreamHistoryClient — read a club's live streams over pure HTTP.
 *
 *   GET app.veo.co/api/v2/live/stream-history/clubs/<club>/stream-history  (Bearer)
 *
 * Each entry's `additional_info.broadcast_link` is the stream.mux.com URL. We
 * map + keep only currently-live rows (reusing the tested pure helpers).
 */

import {
  VeoSessionExpiredError,
  type FetchLike,
  type IVeoStreamHistoryClient,
  type VeoMatchRow,
  type VeoOidcConfig,
} from '../interfaces';

import { mapStreamHistoryToRows, isLiveRow, type StreamHistoryResponse } from './PlaywrightVeoLiveApiScraper';
import { DEFAULT_VEO_OIDC } from './veo-oidc';

export interface HttpVeoStreamHistoryClientDeps {
  fetch: FetchLike;
  config?: VeoOidcConfig;
}

export class HttpVeoStreamHistoryClient implements IVeoStreamHistoryClient {
  private readonly fetch: FetchLike;
  private readonly cfg: VeoOidcConfig;

  constructor(deps: HttpVeoStreamHistoryClientDeps) {
    this.fetch = deps.fetch;
    this.cfg = deps.config ?? DEFAULT_VEO_OIDC;
  }

  async fetchLiveStreams(accessToken: string, clubSlug: string): Promise<VeoMatchRow[]> {
    const url = `${this.cfg.streamHistoryBase}/${clubSlug}/stream-history`;
    const res = await this.fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });

    // 401 → the access token is stale; surface so the caller re-mints.
    if (res.status === 401) throw new VeoSessionExpiredError('Veo access token rejected (401)');
    // 403 → this login has no diagnostics rights on that club; not an error, just no live streams.
    if (res.status === 403) return [];
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Veo stream-history failed for ${clubSlug}: HTTP ${res.status}`);
    }

    const data = (await res.json().catch(() => null)) as StreamHistoryResponse | null;
    return mapStreamHistoryToRows(data).filter(isLiveRow);
  }
}
