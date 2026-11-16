/**
 * Camera source polling cron job.
 * Every minute, finds upcoming DirectStreamEvents (within 10 min) without a streamUrl
 * whose owner has an active camera source, and starts one poller per owner. The
 * poller matches whatever is live on the owner's camera platforms to those games.
 */

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { DEFAULT_MIN_CONFIDENCE, createLiveStreamPoller, pollingSessionManager } from '../modules/camera-sources';

const WINDOW_END_MINUTES = 10;
const POLL_INTERVAL_MS = 60_000;
const MAX_POLL_DURATION_MS = 2 * 60 * 60 * 1000;

export async function checkAndPollCameraSources(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_END_MINUTES * 60 * 1000);

  const events = await prisma.directStreamEvent.findMany({
    where: {
      streamUrl: null,
      status: 'active',
      scheduledStartAt: {
        gte: now,
        lte: windowEnd,
      },
      directStream: {
        ownerAccount: {
          cameraSources: { some: { status: 'active' } },
        },
      },
    },
    select: { directStream: { select: { ownerAccountId: true } } },
  });

  const eventCountByOwner = new Map<string, number>();
  for (const event of events) {
    const ownerAccountId = event.directStream.ownerAccountId;
    eventCountByOwner.set(ownerAccountId, (eventCountByOwner.get(ownerAccountId) ?? 0) + 1);
  }

  for (const [ownerAccountId, eventCount] of eventCountByOwner) {
    if (pollingSessionManager.isPolling(ownerAccountId)) continue;

    try {
      await pollingSessionManager.startPolling(ownerAccountId, createLiveStreamPoller(), {
        ownerAccountId,
        minConfidence: DEFAULT_MIN_CONFIDENCE,
        intervalMs: POLL_INTERVAL_MS,
        maxDurationMs: MAX_POLL_DURATION_MS,
        stopOnFirstMatch: true,
      });
      logger.info({ ownerAccountId, eventCount }, 'Camera source polling started');
    } catch (err) {
      logger.error({ err, ownerAccountId }, 'Camera source polling failed to start');
    }
  }
}
