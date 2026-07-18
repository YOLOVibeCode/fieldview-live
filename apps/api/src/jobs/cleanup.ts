/**
 * Game Cleanup Job
 * 
 * Automatically deletes games older than 14 days and all associated videos/clips
 * Runs daily via cron
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const GAME_RETENTION_DAYS = 14;

export async function cleanupExpiredGames(): Promise<{
  gamesDeleted: number;
  clipsDeleted: number;
  bookmarksDeleted: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - GAME_RETENTION_DAYS);

  logger.info(`Starting cleanup of games older than ${GAME_RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`);

  try {
    // Count what will be deleted
    const gamesToDelete = await prisma.game.findMany({
      where: {
        endsAt: {  // Changed from completedAt to endsAt
          lt: cutoffDate,
        },
      },
      include: {
        _count: {
          select: {
            videoClips: true,
            videoBookmarks: true,
          },
        },
      },
    });

    const gamesCount = gamesToDelete.length;
    const clipsCount = gamesToDelete.reduce((sum, game) => sum + game._count.videoClips, 0);
    const bookmarksCount = gamesToDelete.reduce((sum, game) => sum + game._count.videoBookmarks, 0);

    logger.info(`Found ${gamesCount} games to delete with ${clipsCount} clips and ${bookmarksCount} bookmarks`);

    if (gamesCount === 0) {
      logger.info('No expired games to clean up');
      return { gamesDeleted: 0, clipsDeleted: 0, bookmarksDeleted: 0 };
    }

    // Delete games (cascade will handle clips and bookmarks)
    const deleteResult = await prisma.game.deleteMany({
      where: {
        endsAt: {  // Changed from completedAt to endsAt
          lt: cutoffDate,
        },
      },
    });

    logger.info(
      `Cleanup complete: ${deleteResult.count} games deleted, ` +
      `${clipsCount} clips deleted (cascade), ` +
      `${bookmarksCount} bookmarks deleted (cascade)`
    );

    return {
      gamesDeleted: deleteResult.count,
      clipsDeleted: clipsCount,
      bookmarksDeleted: bookmarksCount,
    };
  } catch (error) {
    logger.error({ error }, 'Error during game cleanup');
    throw error;
  }
}

/**
 * Start the cleanup cron job
 * Runs daily at 2:00 AM
 */
export function startGameCleanupJob(): void {
  // Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running scheduled game cleanup job');
    try {
      const result = await cleanupExpiredGames();
      logger.info({ result }, 'Scheduled cleanup completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled cleanup failed');
    }
  });

  logger.info(`Game cleanup job scheduled (${GAME_RETENTION_DAYS} day retention, runs daily at 2:00 AM)`);
}

/**
 * Cleanup expired clips that have passed their expiresAt date
 * This handles clips not associated with games
 */
export async function cleanupExpiredClips(): Promise<number> {
  const now = new Date();

  logger.info(`Cleaning up clips with expiresAt before ${now.toISOString()}`);

  const deleteResult = await prisma.videoClip.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  logger.info(`Deleted ${deleteResult.count} expired clips`);

  return deleteResult.count;
}

/**
 * Start the expired clips cleanup job
 * Runs every 6 hours
 */
export function startClipCleanupJob(): void {
  // Run every 6 hours (at :00 minutes)
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled clip cleanup job');
    try {
      const count = await cleanupExpiredClips();
      logger.info({ count }, 'Scheduled clip cleanup completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled clip cleanup failed');
    }
  });

  logger.info('Clip cleanup job scheduled (runs every 6 hours)');
}

/**
 * Initialize all cleanup jobs
 */
export function initializeCleanupJobs(): void {
  startGameCleanupJob();
  startClipCleanupJob();
  logger.info('All cleanup jobs initialized');
}

