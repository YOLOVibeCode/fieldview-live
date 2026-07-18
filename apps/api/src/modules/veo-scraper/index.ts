/**
 * Veo Scraper Module — public API.
 * Factory builds orchestrator with default implementations; config from env.
 */

import { prisma } from '../../lib/prisma';
import { VeoScraperOrchestrator } from './VeoScraperOrchestrator';
import { VeoPollingOrchestrator } from './VeoPollingOrchestrator';
import { VeoPollingSessionManager } from './VeoPollingSessionManager';
import { PlaywrightVeoAuthenticator } from './implementations/PlaywrightVeoAuthenticator';
import { PlaywrightVeoDiagnosticsScraper } from './implementations/PlaywrightVeoDiagnosticsScraper';
import { FuseStreamMatcher } from './implementations/FuseStreamMatcher';
import { PrismaStreamUpdater } from './implementations/PrismaStreamUpdater';
import { PrismaVeoCandidateReader } from './implementations/PrismaVeoCandidateReader';
import type { ScraperConfig, ScrapeRunResult, PollingConfig } from './interfaces';

export type { ScraperConfig, ScrapeRunResult, PollingConfig } from './interfaces';
export { VeoScraperOrchestrator } from './VeoScraperOrchestrator';
export { VeoPollingOrchestrator } from './VeoPollingOrchestrator';
export { VeoPollingSessionManager } from './VeoPollingSessionManager';

export const veoPollingSessionManager = new VeoPollingSessionManager();

/**
 * Create orchestrator with default implementations (Playwright, Prisma, Fuse).
 */
export function createVeoScraperOrchestrator(): VeoScraperOrchestrator {
  return new VeoScraperOrchestrator(
    new PlaywrightVeoAuthenticator(),
    new PlaywrightVeoDiagnosticsScraper(),
    new FuseStreamMatcher({ minConfidence: 0.7 }),
    new PrismaStreamUpdater(prisma),
    new PrismaVeoCandidateReader(prisma)
  );
}

/**
 * Create polling orchestrator with default implementations (session-cached).
 */
export function createVeoPollingOrchestrator(): VeoPollingOrchestrator {
  return new VeoPollingOrchestrator(
    new PlaywrightVeoAuthenticator(),
    new PlaywrightVeoDiagnosticsScraper(),
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
    credentials: { email, password },
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
