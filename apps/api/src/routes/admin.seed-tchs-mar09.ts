/**
 * TEMPORARY: One-time seed endpoint for TCHS March 9 events
 * DELETE THIS FILE AFTER USE
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '../lib/logger';

export function createSeedTchsMar09Router(): Router {
  const router = Router();

  router.post('/seed-tchs-mar09', async (_req: Request, res: Response) => {
    try {
      logger.info('Starting TCHS March 9 seed...');

      // Get or create owner account
      let ownerAccount = await prisma.ownerAccount.findFirst();
      if (!ownerAccount) {
        ownerAccount = await prisma.ownerAccount.create({
          data: {
            type: 'owner',
            name: 'Default Owner',
            contactEmail: 'owner@fieldview.live',
            status: 'active',
          },
        });
      }

      // Upsert TCHS stream with admin password tchs2026
      const tchsStream = await prisma.directStream.upsert({
        where: { slug: 'tchs' },
        update: {
          adminPassword: await bcrypt.hash('tchs2026', 10),
        },
        create: {
          slug: 'tchs',
          title: 'TCHS Live Stream',
          ownerAccountId: ownerAccount.id,
          adminPassword: await bcrypt.hash('tchs2026', 10),
          chatEnabled: true,
          scoreboardEnabled: true,
          paywallEnabled: false,
          allowAnonymousView: true,
          sendReminders: true,
        },
      });

      // Create three events
      const events = [
        {
          eventSlug: 'soccer-20260309-jv2',
          title: 'TCHS Soccer - JV2 (Mar 9, 2026)',
          scheduledStartAt: new Date('2026-03-09T16:30:00-05:00'),
        },
        {
          eventSlug: 'soccer-20260309-jv',
          title: 'TCHS Soccer - JV (Mar 9, 2026)',
          scheduledStartAt: new Date('2026-03-09T18:00:00-05:00'),
        },
        {
          eventSlug: 'soccer-20260309-varsity',
          title: 'TCHS Soccer - Varsity (Mar 9, 2026)',
          scheduledStartAt: new Date('2026-03-09T19:30:00-05:00'),
        },
      ];

      const created = [];
      for (const event of events) {
        const result = await prisma.directStreamEvent.upsert({
          where: {
            directStreamId_eventSlug: {
              directStreamId: tchsStream.id,
              eventSlug: event.eventSlug,
            },
          },
          update: {
            title: event.title,
            scheduledStartAt: event.scheduledStartAt,
          },
          create: {
            directStreamId: tchsStream.id,
            eventSlug: event.eventSlug,
            title: event.title,
            scheduledStartAt: event.scheduledStartAt,
            chatEnabled: true,
            scoreboardEnabled: true,
          },
        });
        created.push(result);
      }

      logger.info({ count: created.length }, 'TCHS March 9 events created successfully');

      res.json({
        success: true,
        message: 'TCHS March 9 events created successfully',
        events: created.map((e) => ({
          id: e.id,
          eventSlug: e.eventSlug,
          title: e.title,
          url: `https://fieldview.live/direct/tchs/${e.eventSlug}`,
        })),
        adminPassword: 'tchs2026',
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to seed TCHS March 9 events');
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
