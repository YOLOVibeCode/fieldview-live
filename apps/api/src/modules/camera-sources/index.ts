/**
 * Camera Sources module — public API.
 *
 * `liveStreamFinder` answers "what is live right now for this owner?" (admin search);
 * `createLiveStreamPoller` runs the scheduled match-and-save loop (cron). Both go
 * through the same provider registry, so adding a camera platform touches neither.
 */

import { prisma } from '../../lib/prisma';
import { CameraSourceRepository } from '../../repositories/implementations/CameraSourceRepository';

import { LiveStreamFinder } from './LiveStreamFinder';
import { LiveStreamPoller } from './LiveStreamPoller';
import { LiveStreamSyncer } from './LiveStreamSyncer';
import { PollingSessionManager } from './PollingSessionManager';
import { DEFAULT_MIN_CONFIDENCE, type ILiveStreamFinder, type ILiveStreamPoller } from './interfaces';
import { FuseStreamMatcher } from './matching/FuseStreamMatcher';
import { PrismaCandidateReader } from './matching/PrismaCandidateReader';
import { PrismaStreamUpdater } from './matching/PrismaStreamUpdater';
import { createCameraProviderRegistry } from './registry';

export * from './interfaces';
export { createCameraProviderRegistry } from './registry';
export { sealSecrets } from './secrets';

/** The app's camera source store (reader + writer). */
export const cameraSources = new CameraSourceRepository(prisma);

/** One registry per process, so each provider's token cache is shared by search and cron. */
export const cameraProviderRegistry = createCameraProviderRegistry();

export const liveStreamFinder: ILiveStreamFinder = new LiveStreamFinder({
  sourceReader: cameraSources,
  sourceWriter: cameraSources,
  registry: cameraProviderRegistry,
});

export const pollingSessionManager = new PollingSessionManager();

export function createLiveStreamPoller(): ILiveStreamPoller {
  return new LiveStreamPoller(
    new LiveStreamSyncer({
      finder: liveStreamFinder,
      candidateReader: new PrismaCandidateReader(prisma),
      matcher: new FuseStreamMatcher({ minConfidence: DEFAULT_MIN_CONFIDENCE }),
      updater: new PrismaStreamUpdater(prisma),
    })
  );
}
