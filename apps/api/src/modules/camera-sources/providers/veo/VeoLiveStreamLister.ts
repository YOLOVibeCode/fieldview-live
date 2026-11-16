/**
 * VeoLiveStreamLister — Veo's ILiveStreamLister (pure HTTP, no browser).
 *
 * Stored session cookie → access token (cached per connection) → the club's
 * stream-history → live rows. A rejected token is re-minted and retried once.
 */

import {
  ConnectionExpiredError,
  type CameraConnection,
  type ILiveStreamLister,
  type LiveStream,
} from '../../interfaces';

import type { IVeoAccessTokenProvider, IVeoStreamHistoryClient, VeoMatchRow } from './types';
import { extractClubSlug } from './veo-oidc';

export const VEO_PROVIDER_ID = 'veo';

export interface VeoLiveStreamListerDeps {
  streamClient: IVeoStreamHistoryClient;
  /** Build a token provider bound to one session cookie. */
  createTokenProvider: (sessionCookie: string) => IVeoAccessTokenProvider;
}

export class VeoLiveStreamLister implements ILiveStreamLister {
  private readonly streamClient: IVeoStreamHistoryClient;
  private readonly createTokenProvider: (sessionCookie: string) => IVeoAccessTokenProvider;
  /** One token provider per connection, so a token is minted about once an hour. */
  private readonly tokenProviders = new Map<string, { cookie: string; provider: IVeoAccessTokenProvider }>();

  constructor(deps: VeoLiveStreamListerDeps) {
    this.streamClient = deps.streamClient;
    this.createTokenProvider = deps.createTokenProvider;
  }

  async listLive(connection: CameraConnection): Promise<LiveStream[]> {
    const cookie = connection.secrets.sessionCookie?.trim();
    if (!cookie) {
      throw new ConnectionExpiredError('Veo has no stored session — reconnect required');
    }
    const clubUrl = typeof connection.config.clubUrl === 'string' ? connection.config.clubUrl : '';
    const clubSlug = extractClubSlug(clubUrl);
    if (!clubSlug) {
      throw new Error(`Veo camera source ${connection.id} has no club in its URL`);
    }

    const rows = await this.fetchRows(this.tokenProviderFor(connection.id, cookie), clubSlug);
    return rows.flatMap((row) =>
      row.streamUrl
        ? [
            {
              provider: VEO_PROVIDER_ID,
              title: row.matchName,
              streamUrl: row.streamUrl,
              startedAt: row.createdAtMs != null ? new Date(row.createdAtMs) : null,
            },
          ]
        : []
    );
  }

  private tokenProviderFor(connectionId: string, cookie: string): IVeoAccessTokenProvider {
    const cached = this.tokenProviders.get(connectionId);
    if (cached && cached.cookie === cookie) return cached.provider;
    const provider = this.createTokenProvider(cookie);
    this.tokenProviders.set(connectionId, { cookie, provider });
    return provider;
  }

  private async fetchRows(tokens: IVeoAccessTokenProvider, clubSlug: string): Promise<VeoMatchRow[]> {
    try {
      return await this.streamClient.fetchLiveStreams(await tokens.getAccessToken(), clubSlug);
    } catch (err) {
      // The access token went stale: drop it, re-mint, retry once. If the re-mint
      // or the retry fails too, the session itself is dead and the error propagates.
      if (!(err instanceof ConnectionExpiredError)) throw err;
      tokens.invalidate();
      return await this.streamClient.fetchLiveStreams(await tokens.getAccessToken(), clubSlug);
    }
  }
}
