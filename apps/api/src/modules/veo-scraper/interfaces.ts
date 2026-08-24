/**
 * Veo Scraper Module — ISP interfaces and data types.
 * Segregated interfaces for auth, scrape, match, and update.
 */

export interface VeoCredentials {
  email: string;
  password: string;
  /**
   * A previously-seeded `auth.veo.co` `_session` cookie header (e.g.
   * "_session=…; _session.sig=…"). When present, the HTTP client mints access
   * tokens from it with no browser. Absent for the browser (Playwright) path.
   */
  sessionCookie?: string;
}

/** Authenticated browser context (Playwright BrowserContext at runtime). */
export interface VeoSession {
  context: unknown;
}

// ── HTTP (browser-free) OIDC seams ───────────────────────────────────────────

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

/** Minimal HTTP response shape (satisfied by the global `fetch` Response). */
export interface HttpResponse {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

/** Minimal injectable fetch (satisfied by the global `fetch`). */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: 'follow' | 'manual';
  }
) => Promise<HttpResponse>;

/** Mint a Veo access token from a seeded `_session` cookie (pure HTTP, no browser). */
export interface IVeoTokenMinter {
  mint(sessionCookie: string): Promise<MintedToken>;
}

/** Provide a valid access token, caching + re-minting as it expires. */
export interface IVeoAccessTokenProvider {
  getAccessToken(): Promise<string>;
}

/** Read a club's live stream rows given an access token (browser-free). */
export interface IVeoStreamHistoryClient {
  fetchLiveStreams(accessToken: string, clubSlug: string): Promise<VeoMatchRow[]>;
}

/** Raised when the seeded session cookie no longer mints tokens → owner must re-seed. */
export class VeoSessionExpiredError extends Error {
  constructor(message = 'Veo session cookie expired — reconnect required') {
    super(message);
    this.name = 'VeoSessionExpiredError';
  }
}

export interface VeoMatchRow {
  matchName: string;
  status: string;
  streamUrl: string | null;
  uploadSpeed: number | null;
  firmware: string;
}

export interface MatchCandidate {
  eventId: string;
  eventSlug: string;
  title: string;
  directStreamSlug: string;
  currentStreamUrl: string | null;
}

export interface StreamMatch {
  veoRow: VeoMatchRow;
  event: MatchCandidate;
  confidence: number;
}

export interface UpdateResult {
  updated: number;
  skipped: number;
  details: Array<{
    eventSlug: string;
    oldUrl: string | null;
    newUrl: string;
    confidence: number;
  }>;
}

export interface ScraperConfig {
  credentials: VeoCredentials;
  diagnosticsUrl: string;
  ownerAccountId: string;
  minConfidence?: number;
}

export interface PollingConfig extends ScraperConfig {
  intervalMs?: number;
  maxDurationMs?: number;
  stopOnFirstMatch?: boolean;
  onStop?: () => void;
}

export interface ScrapeRunResult {
  scraped: number;
  matched: number;
  updated: number;
  skipped: number;
  details: UpdateResult['details'];
}

/** Authenticate with Veo and provide an authenticated session. */
export interface IVeoAuthenticator {
  login(credentials: VeoCredentials): Promise<VeoSession>;
  logout(session: VeoSession): Promise<void>;
}

/** Scrape the streaming diagnostics page and return structured rows. */
export interface IVeoDiagnosticsScraper {
  scrape(session: VeoSession, diagnosticsUrl: string): Promise<VeoMatchRow[]>;
}

/** Fuzzy-match scraped Veo rows to DirectStreamEvent candidates. */
export interface IVeoStreamMatcher {
  match(
    scrapedRows: VeoMatchRow[],
    candidates: MatchCandidate[]
  ): Promise<StreamMatch[]>;
}

/** Persist matched stream URLs to DirectStreamEvent. */
export interface IVeoStreamUpdater {
  updateStreamUrls(matches: StreamMatch[]): Promise<UpdateResult>;
}

/** Load DirectStreamEvent candidates for an owner account (for matching). */
export interface IVeoCandidateReader {
  getCandidates(ownerAccountId: string): Promise<MatchCandidate[]>;
}

/** Session-cached polling: login once, poll repeatedly until stop or max duration. */
export interface IVeoPollingOrchestrator {
  start(config: PollingConfig): Promise<void>;
  stop(): Promise<void>;
  pollOnce(): Promise<ScrapeRunResult>;
}
