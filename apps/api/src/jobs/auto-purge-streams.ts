/**
 * Auto-Purge Job for DirectStream
 * Runs daily to permanently delete streams past their 14-day retention
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function autoPurgeDeletedStreams() {
  try {
    const now = new Date();

    // Find streams marked for deletion that are past their purge date
    const streamsToPurge = await prisma.directStream.findMany({
      where: {
        status: 'deleted',
        autoPurgeAt: {
          lte: now, // Past purge date
        },
      },
      include: {
        chatMessages: { select: { id: true } },
        purchases: { select: { id: true } },
        scoreboard: { select: { id: true } },
      },
    });

    if (streamsToPurge.length === 0) {
      logger.info('Auto-purge: No streams to purge');
      return;
    }

    logger.info(
      { count: streamsToPurge.length, slugs: streamsToPurge.map((s) => s.slug) },
      'Auto-purge: Starting purge of deleted streams'
    );

    for (const stream of streamsToPurge) {
      try {
        // Permanently delete the stream
        await prisma.directStream.delete({
          where: { id: stream.id },
        });

        logger.info(
          {
            slug: stream.slug,
            id: stream.id,
            deletedAt: stream.deletedAt,
            preservedChat: stream.chatMessages.length,
            preservedPurchases: stream.purchases.length,
          },
          'Auto-purge: Stream permanently deleted'
        );
      } catch (error) {
        logger.error(
          { error, slug: stream.slug, id: stream.id },
          'Auto-purge: Failed to delete stream'
        );
      }
    }

    logger.info(
      { purgedCount: streamsToPurge.length },
      'Auto-purge: Completed successfully'
    );
  } catch (error) {
    logger.error({ error }, 'Auto-purge: Job failed');
  }
}

