/**
 * Veo Scraper Module — ISP interfaces and data types.
 * Segregated interfaces for auth, scrape, match, and update.
 */

export interface VeoCredentials {
  email: string;
  password: string;
}

/** Authenticated browser context (Playwright BrowserContext at runtime). */
export interface VeoSession {
  context: unknown;
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
