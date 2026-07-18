/**
 * Session-cached Veo polling: login once, poll every intervalMs until stop or maxDurationMs.
 */

import type {
  IVeoAuthenticator,
  IVeoDiagnosticsScraper,
  IVeoStreamMatcher,
  IVeoStreamUpdater,
  IVeoCandidateReader,
  PollingConfig,
  ScrapeRunResult,
  StreamMatch,
  VeoSession,
} from './interfaces';

const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_DURATION_MS = 7_200_000;
const DEFAULT_STOP_ON_FIRST_MATCH = true;

export class VeoPollingOrchestrator {
  private session: VeoSession | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: PollingConfig | null = null;
  private startTime: number = 0;
  private didReLogin = false;

  constructor(
    private authenticator: IVeoAuthenticator,
    private scraper: IVeoDiagnosticsScraper,
    private matcher: IVeoStreamMatcher,
    private updater: IVeoStreamUpdater,
    private candidateReader: IVeoCandidateReader
  ) {}

  async start(config: PollingConfig): Promise<void> {
    if (this.session) {
      await this.stop();
    }
    const intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
    const maxDurationMs = config.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

    this.session = await this.authenticator.login(config.credentials);
    this.config = config;
    this.startTime = Date.now();
    this.didReLogin = false;

    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= maxDurationMs) {
        void this.stop();
        return;
      }
      void this.pollOnce();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    this.config?.onStop?.();
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.session) {
      await this.authenticator.logout(this.session);
      this.session = null;
    }
    this.config = null;
  }

  async pollOnce(): Promise<ScrapeRunResult> {
    const cfg = this.config;
    const sess = this.session;
    if (!cfg || !sess) {
      return {
        scraped: 0,
        matched: 0,
        updated: 0,
        skipped: 0,
        details: [],
      };
    }

    const minConfidence = cfg.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const stopOnFirstMatch = cfg.stopOnFirstMatch ?? DEFAULT_STOP_ON_FIRST_MATCH;

    let rows: Awaited<ReturnType<IVeoDiagnosticsScraper['scrape']>>;
    try {
      rows = await this.scraper.scrape(sess, cfg.diagnosticsUrl);
    } catch (err) {
      if (!this.didReLogin && this.session) {
        this.didReLogin = true;
        await this.authenticator.logout(this.session);
        this.session = await this.authenticator.login(cfg.credentials);
        rows = await this.scraper.scrape(this.session, cfg.diagnosticsUrl);
      } else {
        throw err;
      }
    }

    const candidates = await this.candidateReader.getCandidates(cfg.ownerAccountId);
    const matches = await this.matcher.match(rows, candidates);
    const highConfidence = matches.filter(
      (m): m is StreamMatch => m.confidence >= minConfidence
    );
    const updateResult = await this.updater.updateStreamUrls(highConfidence);

    const result: ScrapeRunResult = {
      scraped: rows.length,
      matched: highConfidence.length,
      updated: updateResult.updated,
      skipped: updateResult.skipped,
      details: updateResult.details,
    };

    if (stopOnFirstMatch && result.updated > 0) {
      await this.stop();
    }

    return result;
  }
}
