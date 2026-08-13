/**
 * Veo Scraper Module — public API.
 * Factory builds orchestrator with default implementations; config from env.
 */

import { prisma } from '../../lib/prisma';
import { VeoScraperOrchestrator } from './VeoScraperOrchestrator';
import { VeoPollingOrchestrator } from './VeoPollingOrchestrator';
import { VeoPollingSessionManager } from './VeoPollingSessionManager';
import { PlaywrightVeoAuthenticator } from './implementations/PlaywrightVeoAuthenticator';
// The diagnostics page is an SPA — parsing its HTML returns nothing. We capture the
// SPA's own authenticated stream-history JSON fetch instead. (HTML scraper kept for ref.)
import { PlaywrightVeoLiveApiScraper } from './implementations/PlaywrightVeoLiveApiScraper';
import { FuseStreamMatcher } from './implementations/FuseStreamMatcher';
import { PrismaStreamUpdater } from './implementations/PrismaStreamUpdater';
import { PrismaVeoCandidateReader } from './implementations/PrismaVeoCandidateReader';
// Browser-free (pure HTTP) path — see veo-integration-plan memory (2026-08-12).
import { HttpVeoAuthenticator } from './implementations/HttpVeoAuthenticator';
import { HttpVeoStreamScraper } from './implementations/HttpVeoStreamScraper';
import { HttpVeoStreamHistoryClient } from './implementations/HttpVeoStreamHistoryClient';
import type {
  FetchLike,
  IVeoAuthenticator,
  IVeoDiagnosticsScraper,
  ScraperConfig,
  ScrapeRunResult,
  PollingConfig,
} from './interfaces';

export type { ScraperConfig, ScrapeRunResult, PollingConfig } from './interfaces';
export { VeoScraperOrchestrator } from './VeoScraperOrchestrator';
export { VeoPollingOrchestrator } from './VeoPollingOrchestrator';
export { VeoPollingSessionManager } from './VeoPollingSessionManager';

export { VeoCookieSeeder } from './implementations/VeoCookieSeeder';
export { pickSessionCookieHeader } from './implementations/veo-cookie';
export { HttpVeoAuthenticator } from './implementations/HttpVeoAuthenticator';
export { HttpVeoStreamScraper } from './implementations/HttpVeoStreamScraper';
export { HttpVeoStreamHistoryClient } from './implementations/HttpVeoStreamHistoryClient';

export const veoPollingSessionManager = new VeoPollingSessionManager();

/**
 * Select the auth + scrape pair. Browser-free HTTP path when `VEO_HTTP_MODE`
 * is 'true' (needs a seeded `credentials.sessionCookie`); otherwise the
 * Playwright path. The HTTP path removes Chromium from the hot path.
 */
function buildVeoAuthAndScraper(httpMode?: boolean): { authenticator: IVeoAuthenticator; scraper: IVeoDiagnosticsScraper } {
  const useHttp = httpMode ?? process.env.VEO_HTTP_MODE === 'true';
  if (useHttp) {
    return {
      authenticator: new HttpVeoAuthenticator(),
      scraper: new HttpVeoStreamScraper({
        streamClient: new HttpVeoStreamHistoryClient({ fetch: globalThis.fetch as unknown as FetchLike }),
      }),
    };
  }
  return {
    authenticator: new PlaywrightVeoAuthenticator(),
    scraper: new PlaywrightVeoLiveApiScraper(),
  };
}

/**
 * Create orchestrator with default implementations (Prisma, Fuse) + the
 * env-selected auth/scrape pair (Playwright or browser-free HTTP).
 */
export function createVeoScraperOrchestrator(opts?: { httpMode?: boolean }): VeoScraperOrchestrator {
  const { authenticator, scraper } = buildVeoAuthAndScraper(opts?.httpMode);
  return new VeoScraperOrchestrator(
    authenticator,
    scraper,
    new FuseStreamMatcher({ minConfidence: 0.7 }),
    new PrismaStreamUpdater(prisma),
    new PrismaVeoCandidateReader(prisma)
  );
}

/**
 * Create polling orchestrator with default implementations (session-cached).
 */
export function createVeoPollingOrchestrator(opts?: { httpMode?: boolean }): VeoPollingOrchestrator {
  const { authenticator, scraper } = buildVeoAuthAndScraper(opts?.httpMode);
  return new VeoPollingOrchestrator(
    authenticator,
    scraper,
    new FuseStreamMatcher({ minConfidence: 0.7 }),
    new PrismaStreamUpdater(prisma),
    new PrismaVeoCandidateReader(prisma)
  );
}

/**
 * Build config from process.env (VEO_EMAIL, VEO_PASSWORD, VEO_DIAGNOSTICS_URL, VEO_OWNER_ACCOUNT_ID).
 */
export function getVeoScraperConfigFromEnv(): ScraperConfig {
  const email = process.env.VEO_EMAIL;
  const password = process.env.VEO_PASSWORD;
  const diagnosticsUrl = process.env.VEO_DIAGNOSTICS_URL;
  const ownerAccountId = process.env.VEO_OWNER_ACCOUNT_ID;

  if (!email || !password) {
    throw new Error('VEO_EMAIL and VEO_PASSWORD are required');
  }
  if (!diagnosticsUrl) {
    throw new Error('VEO_DIAGNOSTICS_URL is required');
  }
  if (!ownerAccountId) {
    throw new Error('VEO_OWNER_ACCOUNT_ID is required');
  }

  return {
    // sessionCookie (browser-free path) is optional; supplied via env for scripts
    // or from VeoIntegration.veoSessionCookie by the job.
    credentials: { email, password, sessionCookie: process.env.VEO_SESSION_COOKIE },
    diagnosticsUrl,
    ownerAccountId,
    minConfidence: 0.7,
  };
}

/**
 * Run the Veo scraper with env-based config. For use from scripts.
 */
export async function runVeoScraperFromEnv(): Promise<ScrapeRunResult> {
  const orchestrator = createVeoScraperOrchestrator();
  const config = getVeoScraperConfigFromEnv();
  return orchestrator.run(config);
}
