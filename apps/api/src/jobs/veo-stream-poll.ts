/**
 * Veo stream polling cron job.
 * Every minute, finds upcoming DirectStreamEvents (within 10 min) without streamUrl
 * whose owner has VeoIntegration, and starts a session-cached poller per owner.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { decrypt } from '../lib/encryption';
import {
  veoPollingSessionManager,
  createVeoPollingOrchestrator,
} from '../modules/veo-scraper';

const WINDOW_START_MINUTES = 0;
const WINDOW_END_MINUTES = 10;
const POLL_INTERVAL_MS = 60_000;
const MAX_POLL_DURATION_MS = 2 * 60 * 60 * 1000;

export async function checkAndPollVeoStreams(): Promise<void> {
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
          veoIntegration: { isNot: null },
        },
      },
    },
    include: {
      directStream: {
        include: {
          ownerAccount: {
            include: { veoIntegration: true },
          },
        },
      },
    },
  });

  const ownerIds = [...new Set(events.map((e) => e.directStream.ownerAccountId))];

  for (const ownerAccountId of ownerIds) {
    if (veoPollingSessionManager.isPolling(ownerAccountId)) continue;

    const event = events.find((e) => e.directStream.ownerAccountId === ownerAccountId);
    const veo = event?.directStream.ownerAccount.veoIntegration;
    if (!veo) continue;

    let veoPassword: string;
    try {
      veoPassword = decrypt(veo.veoPasswordEncrypted);
    } catch (err) {
      logger.warn({ err, ownerAccountId }, 'Veo polling: failed to decrypt Veo password');
      continue;
    }

    const config = {
      credentials: { email: veo.veoEmail, password: veoPassword },
      diagnosticsUrl: veo.veoDiagnosticsUrl,
      ownerAccountId,
      minConfidence: 0.7,
      intervalMs: POLL_INTERVAL_MS,
      maxDurationMs: MAX_POLL_DURATION_MS,
      stopOnFirstMatch: true,
    };

    try {
      const poller = createVeoPollingOrchestrator();
      await veoPollingSessionManager.startPolling(ownerAccountId, poller, config);
      logger.info(
        { ownerAccountId, eventCount: events.filter((e) => e.directStream.ownerAccountId === ownerAccountId).length },
        'Veo polling started'
      );
    } catch (err) {
      logger.error({ err, ownerAccountId }, 'Veo polling failed to start');
    }
  }
}
