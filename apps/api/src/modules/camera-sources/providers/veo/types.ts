/**
 * Veo-only types. Nothing outside `providers/veo/` should import from here —
 * the rest of the module talks to Veo through ILiveStreamLister / ICameraConnector.
 */

/** Static OIDC client config for Veo (public client; PKCE S256). */
export interface VeoOidcConfig {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  streamHistoryBase: string;
  scope: string;
}

/** A minted access token plus its lifetime in seconds. */
export interface MintedToken {
  accessToken: string;
  expiresInSec: number;
}

/** Mint a Veo access token from a seeded `_session` cookie (pure HTTP, no browser). */
export interface IVeoTokenMinter {
  mint(sessionCookie: string): Promise<MintedToken>;
}

/** Provide a valid access token, caching + re-minting as it expires. */
export interface IVeoAccessTokenProvider {
  getAccessToken(): Promise<string>;
  /** Drop the cached token so the next call re-mints (after a 401). */
  invalidate(): void;
}

/** Read a club's live stream rows given an access token (browser-free). */
export interface IVeoStreamHistoryClient {
  fetchLiveStreams(accessToken: string, clubSlug: string): Promise<VeoMatchRow[]>;
}

/** One row of Veo's stream-history API. */
export interface VeoMatchRow {
  matchName: string;
  status: string;
  streamUrl: string | null;
  uploadSpeed: number | null;
  firmware: string;
  /** When the broadcast was created, epoch milliseconds (`creation_time`). */
  createdAtMs: number | null;
}

// ── Signing in ───────────────────────────────────────────────────────────────

export interface VeoLoginCredentials {
  email: string;
  password: string;
}

/** Turn an email + password into the durable `_session` cookie header. */
export interface IVeoSessionSeeder {
  seed(credentials: VeoLoginCredentials): Promise<string>;
}
