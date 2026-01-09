/**
 * DirectStream Lifecycle Management API
 * Handles archiving, deletion, and auto-purge for DirectStream instances
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { validateAdminToken } from '../middleware/admin-jwt';

const router = Router();

/**
 * POST /api/direct/:slug/archive
 * Archive a stream (preserves all data, makes read-only)
 * Admin JWT required
 */
router.post(
  '/:slug/archive',
  validateAdminToken,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;

        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const stream = await prisma.directStream.findUnique({
          where: { slug },
          include: {
            scoreboard: true,
            chatMessages: true,
            purchases: true,
          },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        if (stream.status === 'archived') {
          return res.status(400).json({ error: 'Stream already archived' });
        }

        if (stream.status === 'deleted') {
          return res.status(400).json({ error: 'Cannot archive deleted stream' });
        }

        // Archive the stream
        const archived = await prisma.directStream.update({
          where: { slug },
          data: {
            status: 'archived',
            archivedAt: new Date(),
          },
        });

        // Get stats
        const chatCount = stream.chatMessages.length;
        const finalScore = stream.scoreboard
          ? { home: stream.scoreboard.homeScore, away: stream.scoreboard.awayScore }
          : null;

        logger.info(
          {
            slug,
            archivedAt: archived.archivedAt,
            chatMessages: chatCount,
            finalScore,
          },
          'DirectStream archived'
        );

        return res.json({
          success: true,
          status: 'archived',
          archivedAt: archived.archivedAt,
          preservedChatMessages: chatCount,
          finalScore,
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to archive stream');
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/direct/:slug
 * Soft delete a stream (marks as deleted, schedules auto-purge after 14 days)
 * Admin JWT required
 */
router.delete(
  '/:slug',
  validateAdminToken,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const { permanent } = req.query; // ?permanent=true for immediate hard delete

        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const stream = await prisma.directStream.findUnique({
          where: { slug },
          include: {
            chatMessages: true,
            purchases: true,
          },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Hard delete (permanent)
        if (permanent === 'true') {
          // Delete stream (cascades to scoreboard, Game will be SetNull)
          await prisma.directStream.delete({
            where: { slug },
          });

          // Chat messages are preserved via SetNull on directStreamId
          // Purchases are preserved via SetNull on directStreamId

          logger.warn(
            {
              slug,
              preservedChat: stream.chatMessages.length,
              preservedPurchases: stream.purchases.length,
            },
            'DirectStream PERMANENTLY deleted'
          );

          return res.json({
            success: true,
            type: 'permanent',
            message: 'Stream permanently deleted',
            preservedChatMessages: stream.chatMessages.length,
            preservedPurchases: stream.purchases.length,
          });
        }

        // Soft delete (default)
        const deletedAt = new Date();
        const autoPurgeAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days

        const deleted = await prisma.directStream.update({
          where: { slug },
          data: {
            status: 'deleted',
            deletedAt,
            autoPurgeAt,
          },
        });

        logger.info(
          {
            slug,
            deletedAt: deleted.deletedAt,
            autoPurgeAt: deleted.autoPurgeAt,
          },
          'DirectStream soft deleted (14-day auto-purge scheduled)'
        );

        return res.json({
          success: true,
          type: 'soft',
          status: 'deleted',
          deletedAt: deleted.deletedAt,
          autoPurgeAt: deleted.autoPurgeAt,
          message: 'Stream marked for deletion. Auto-purge in 14 days.',
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to delete stream');
        next(error);
      }
    })();
  }
);

/**
 * POST /api/direct/:slug/restore
 * Restore a soft-deleted stream (cancels auto-purge)
 * Admin JWT required
 */
router.post(
  '/:slug/restore',
  validateAdminToken,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;

        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const stream = await prisma.directStream.findUnique({
          where: { slug },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        if (stream.status === 'active') {
          return res.status(400).json({ error: 'Stream is already active' });
        }

        // Restore to active status
        const restored = await prisma.directStream.update({
          where: { slug },
          data: {
            status: 'active',
            deletedAt: null,
            autoPurgeAt: null,
          },
        });

        logger.info({ slug }, 'DirectStream restored to active');

        return res.json({
          success: true,
          status: 'active',
          message: 'Stream restored successfully',
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to restore stream');
        next(error);
      }
    })();
  }
);

/**
 * GET /api/direct/admin/streams
 * List all streams with their lifecycle status
 * Admin JWT required (global admin, not slug-specific)
 */
router.get(
  '/admin/streams',
  validateAdminToken,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { status } = req.query; // Filter by status: active, archived, deleted

        const where: any = {};
        if (status && typeof status === 'string') {
          where.status = status;
        }

        const streams = await prisma.directStream.findMany({
          where,
          include: {
            scoreboard: {
              select: {
                homeScore: true,
                awayScore: true,
                homeTeamName: true,
                awayTeamName: true,
              },
            },
            _count: {
              select: {
                chatMessages: true,
                purchases: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return res.json({
          success: true,
          count: streams.length,
          streams: streams.map((s) => ({
            slug: s.slug,
            title: s.title,
            status: s.status,
            createdAt: s.createdAt,
            archivedAt: s.archivedAt,
            deletedAt: s.deletedAt,
            autoPurgeAt: s.autoPurgeAt,
            chatMessages: s._count.chatMessages,
            purchases: s._count.purchases,
            scoreboard: s.scoreboard,
          })),
        });
      } catch (error) {
        logger.error({ error }, 'Failed to list streams');
        next(error);
      }
    })();
  }
);

export function createDirectLifecycleRouter(): Router {
  return router;
}

