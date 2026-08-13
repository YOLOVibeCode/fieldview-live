/**
 * HttpVeoStreamScraper — the browser-free IVeoDiagnosticsScraper.
 *
 * Reads the token provider off the session (put there by HttpVeoAuthenticator),
 * derives the club slug from the diagnostics URL, and fetches live streams over
 * pure HTTP. On a 401 (stale access token) it invalidates + re-mints once; if
 * that also fails, the session cookie is truly dead and the error propagates.
 */

import {
  VeoSessionExpiredError,
  type IVeoDiagnosticsScraper,
  type IVeoStreamHistoryClient,
  type VeoMatchRow,
  type VeoSession,
} from '../interfaces';

import type { InvalidatableTokenProvider } from './HttpVeoAuthenticator';
import { extractClubSlug } from './veo-oidc';

export interface HttpVeoStreamScraperDeps {
  streamClient: IVeoStreamHistoryClient;
}

export class HttpVeoStreamScraper implements IVeoDiagnosticsScraper {
  private readonly streamClient: IVeoStreamHistoryClient;

  constructor(deps: HttpVeoStreamScraperDeps) {
    this.streamClient = deps.streamClient;
  }

  async scrape(session: VeoSession, diagnosticsUrl: string): Promise<VeoMatchRow[]> {
    const provider = (session.context as { provider?: InvalidatableTokenProvider }).provider;
    if (!provider) throw new Error('HttpVeoStreamScraper: session has no token provider');

    const clubSlug = extractClubSlug(diagnosticsUrl);
    if (!clubSlug) throw new Error(`HttpVeoStreamScraper: no club slug in "${diagnosticsUrl}"`);

    const token = await provider.getAccessToken();
    try {
      return await this.streamClient.fetchLiveStreams(token, clubSlug);
    } catch (err) {
      // A 401 means the access token went stale; drop it, re-mint, and retry once.
      // If the re-mint itself fails (authorize yields no code), the cookie is dead → propagate.
      if (err instanceof VeoSessionExpiredError && provider.invalidate) {
        provider.invalidate();
        const fresh = await provider.getAccessToken();
        return await this.streamClient.fetchLiveStreams(fresh, clubSlug);
      }
      throw err;
    }
  }
}
