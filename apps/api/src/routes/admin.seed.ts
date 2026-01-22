/**
 * Admin Seed Route - Trigger DirectStream seeding from API
 * 
 * POST /api/admin/seed/direct-streams
 * 
 * This allows seeding the production database from within Railway's network.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/encryption';
import { logger } from '../lib/logger';

const router = express.Router();

// Seed data
const directStreams = [
  {
    slug: 'tchs',
    title: 'TCHS Live Stream',
    streamUrl: null,
    scheduledStartAt: null,
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'tchs2026',
    chatEnabled: true,
    scoreboardEnabled: true,
    allowAnonymousView: true,
    requireEmailVerification: true,
    listed: true,
    sendReminders: true,
    reminderMinutes: 5,
    scoreboardHomeTeam: null,
    scoreboardAwayTeam: null,
    scoreboardHomeColor: null,
    scoreboardAwayColor: null,
  },
  {
    slug: 'tchs/soccer-20260122-jv2',
    title: 'TCHS Soccer JV2 - January 22, 2026',
    streamUrl: null,
    scheduledStartAt: null,
    paywallEnabled: false,
    priceInCents: 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'tchs2026',
    chatEnabled: true,
    scoreboardEnabled: true,
    allowAnonymousView: true,
    requireEmailVerification: true,
    listed: true,
    sendReminders: true,
    reminderMinutes: 5,
    scoreboardHomeTeam: 'TCHS JV2',
    scoreboardAwayTeam: 'Away Team',
    scoreboardHomeColor: '#003366',
    scoreboardAwayColor: '#CC0000',
  },
];

/**
 * POST /api/admin/seed/direct-streams
 * Seed DirectStreams (idempotent)
 */
router.post('/direct-streams', (_req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      logger.info('Starting DirectStream seed...');

      // Get default owner account
      const defaultOwner = await prisma.ownerAccount.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultOwner) {
        return res.status(500).json({ 
          error: 'No OwnerAccount found. Please create one first.' 
        });
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const results = [];

      for (const streamData of directStreams) {
        try {
          // Check if stream exists
          const existing = await prisma.directStream.findUnique({
            where: { slug: streamData.slug },
          });

          // Hash password
          const adminPasswordHash = await hashPassword(streamData.adminPassword);

          if (existing) {
            // Update existing stream
            await prisma.directStream.update({
              where: { slug: streamData.slug },
              data: {
                title: streamData.title,
                chatEnabled: streamData.chatEnabled,
                scoreboardEnabled: streamData.scoreboardEnabled,
                allowAnonymousView: streamData.allowAnonymousView,
                requireEmailVerification: streamData.requireEmailVerification,
                listed: streamData.listed,
                adminPassword: adminPasswordHash,
              },
            });
            results.push({ slug: streamData.slug, action: 'updated' });
            updated++;
            logger.info({ slug: streamData.slug }, 'DirectStream updated');
          } else {
            // 🆕 Auto-create Game record for DirectStream (required for viewer registration/chat)
            const gameTitle = `Direct Stream: ${streamData.slug}`;
            let game = await prisma.game.findFirst({
              where: { title: gameTitle },
              select: { id: true },
            });

            if (!game) {
              game = await prisma.game.create({
                data: {
                  ownerAccountId: defaultOwner.id,
                  title: gameTitle,
                  homeTeam: streamData.title || streamData.slug,
                  awayTeam: 'TBD',
                  startsAt: streamData.scheduledStartAt ? new Date(streamData.scheduledStartAt) : new Date(),
                  priceCents: streamData.priceInCents || 0,
                  currency: 'USD',
                  keywordCode: `DIRECT-${streamData.slug.toUpperCase()}-${Date.now()}`,
                  qrUrl: '',
                  state: 'active',
                },
              });
              logger.info({ gameId: game.id, slug: streamData.slug }, 'Game auto-created for DirectStream');
            }

            // Create new stream with Game link
            await prisma.directStream.create({
              data: {
                slug: streamData.slug,
                title: streamData.title,
                streamUrl: streamData.streamUrl,
                scheduledStartAt: streamData.scheduledStartAt,
                paywallEnabled: streamData.paywallEnabled,
                priceInCents: streamData.priceInCents,
                paywallMessage: streamData.paywallMessage,
                allowSavePayment: streamData.allowSavePayment,
                adminPassword: adminPasswordHash,
                chatEnabled: streamData.chatEnabled,
                scoreboardEnabled: streamData.scoreboardEnabled,
                allowAnonymousView: streamData.allowAnonymousView,
                requireEmailVerification: streamData.requireEmailVerification,
                listed: streamData.listed,
                sendReminders: streamData.sendReminders,
                reminderMinutes: streamData.reminderMinutes,
                scoreboardHomeTeam: streamData.scoreboardHomeTeam,
                scoreboardAwayTeam: streamData.scoreboardAwayTeam,
                scoreboardHomeColor: streamData.scoreboardHomeColor,
                scoreboardAwayColor: streamData.scoreboardAwayColor,
                ownerAccountId: defaultOwner.id,
                gameId: game.id, // 🆕 Link to auto-created Game
              },
            });
            results.push({ slug: streamData.slug, action: 'created' });
            created++;
            logger.info({ slug: streamData.slug }, 'DirectStream created');
          }
        } catch (error: any) {
          logger.error({ error, slug: streamData.slug }, 'Failed to process DirectStream');
          results.push({ slug: streamData.slug, action: 'skipped', error: error.message });
          skipped++;
        }
      }

      logger.info({ created, updated, skipped }, 'DirectStream seed complete');

      res.json({
        success: true,
        message: 'DirectStream seed complete',
        summary: {
          created,
          updated,
          skipped,
          total: created + updated + skipped,
        },
        results,
        ownerAccount: {
          id: defaultOwner.id,
          name: defaultOwner.name,
          contactEmail: defaultOwner.contactEmail,
        },
      });
    } catch (error: any) {
      logger.error({ error }, 'DirectStream seed failed');
      next(error);
    }
  })();
});

export function createAdminSeedRouter(): express.Router {
  return router;
}

