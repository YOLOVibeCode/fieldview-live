/**
 * Veo Scraper Orchestrator — composes auth, scrape, match, and update.
 */

import type {
  IVeoAuthenticator,
  IVeoDiagnosticsScraper,
  IVeoStreamMatcher,
  IVeoStreamUpdater,
  IVeoCandidateReader,
  ScraperConfig,
  ScrapeRunResult,
  StreamMatch,
} from './interfaces';

const DEFAULT_MIN_CONFIDENCE = 0.7;

export class VeoScraperOrchestrator {
  constructor(
    private authenticator: IVeoAuthenticator,
    private scraper: IVeoDiagnosticsScraper,
    private matcher: IVeoStreamMatcher,
    private updater: IVeoStreamUpdater,
    private candidateReader: IVeoCandidateReader
  ) {}

  async run(config: ScraperConfig): Promise<ScrapeRunResult> {
    const minConfidence = config.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const session = await this.authenticator.login(config.credentials);

    try {
      const [rows, candidates] = await Promise.all([
        this.scraper.scrape(session, config.diagnosticsUrl),
        this.candidateReader.getCandidates(config.ownerAccountId),
      ]);

      const matches = await this.matcher.match(rows, candidates);
      const highConfidence = matches.filter(
        (m): m is StreamMatch => m.confidence >= minConfidence
      );

      const updateResult = await this.updater.updateStreamUrls(highConfidence);

      return {
        scraped: rows.length,
        matched: highConfidence.length,
        updated: updateResult.updated,
        skipped: updateResult.skipped,
        details: updateResult.details,
      };
    } finally {
      await this.authenticator.logout(session);
    }
  }
}
