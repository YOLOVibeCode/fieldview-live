/**
 * Admin Seed Route — Generic DirectStream + Event provisioning
 *
 * POST /api/admin/seed/direct-stream   (body-driven, idempotent)
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/encryption';
import { logger } from '../lib/logger';
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth';

const router = express.Router();

router.use(requireAdminAuth);
router.use(requireSuperAdmin);

const EventInput = z.object({
  eventSlug: z.string().min(1),
  title: z.string().min(1),
  scheduledStartAt: z.string().datetime({ offset: true }).optional(),
  chatEnabled: z.boolean().optional().default(true),
  scoreboardEnabled: z.boolean().optional().default(true),
  scoreboardHomeTeam: z.string().optional(),
  scoreboardAwayTeam: z.string().optional(),
  scoreboardHomeColor: z.string().optional(),
  scoreboardAwayColor: z.string().optional(),
});

const SeedDirectStreamBody = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric + dashes'),
  title: z.string().min(1),
  adminPassword: z.string().min(4),

  chatEnabled: z.boolean().optional().default(true),
  scoreboardEnabled: z.boolean().optional().default(true),
  paywallEnabled: z.boolean().optional().default(false),
  allowAnonymousView: z.boolean().optional().default(true),
  sendReminders: z.boolean().optional().default(true),

  scoreboardHomeTeam: z.string().optional(),
  scoreboardAwayTeam: z.string().optional(),
  scoreboardHomeColor: z.string().optional(),
  scoreboardAwayColor: z.string().optional(),

  events: z.array(EventInput).optional().default([]),
});

/**
 * POST /api/admin/seed/direct-stream
 *
 * Body-driven, idempotent upsert of a DirectStream parent + optional events.
 * Works for any team — no code change or redeploy needed.
 *
 * Example body:
 * {
 *   "slug": "dentondiablos",
 *   "title": "Denton Diablos",
 *   "adminPassword": "devil2026",
 *   "scoreboardHomeTeam": "Denton Diablos",
 *   "scoreboardAwayTeam": "Away",
 *   "scoreboardHomeColor": "#CC0000",
 *   "scoreboardAwayColor": "#333333",
 *   "events": [
 *     {
 *       "eventSlug": "soccer-2008-20260325",
 *       "title": "Denton Diablos 2008 (Mar 25, 2026)",
 *       "scheduledStartAt": "2026-03-25T18:00:00-05:00"
 *     }
 *   ]
 * }
 */
router.post('/direct-stream', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const parsed = SeedDirectStreamBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: { code: 'VALIDATION', issues: parsed.error.issues } });
        return;
      }
      const body = parsed.data;

      logger.info({ slug: body.slug, eventCount: body.events.length }, 'Seeding DirectStream');

      let ownerAccount = await prisma.ownerAccount.findFirst();
      if (!ownerAccount) {
        ownerAccount = await prisma.ownerAccount.create({
          data: {
            type: 'owner',
            name: 'System Owner',
            status: 'active',
            contactEmail: 'owner@fieldview.live',
          },
        });
      }

      const parentStream = await prisma.directStream.upsert({
        where: { slug: body.slug },
        update: {
          title: body.title,
          chatEnabled: body.chatEnabled,
          scoreboardEnabled: body.scoreboardEnabled,
          paywallEnabled: body.paywallEnabled,
          allowAnonymousView: body.allowAnonymousView,
          sendReminders: body.sendReminders,
          scoreboardHomeTeam: body.scoreboardHomeTeam ?? null,
          scoreboardAwayTeam: body.scoreboardAwayTeam ?? null,
          scoreboardHomeColor: body.scoreboardHomeColor ?? null,
          scoreboardAwayColor: body.scoreboardAwayColor ?? null,
        },
        create: {
          slug: body.slug,
          title: body.title,
          ownerAccountId: ownerAccount.id,
          adminPassword: await hashPassword(body.adminPassword),
          chatEnabled: body.chatEnabled,
          scoreboardEnabled: body.scoreboardEnabled,
          paywallEnabled: body.paywallEnabled,
          allowAnonymousView: body.allowAnonymousView,
          sendReminders: body.sendReminders,
          scoreboardHomeTeam: body.scoreboardHomeTeam ?? null,
          scoreboardAwayTeam: body.scoreboardAwayTeam ?? null,
          scoreboardHomeColor: body.scoreboardHomeColor ?? null,
          scoreboardAwayColor: body.scoreboardAwayColor ?? null,
        },
      });

      const events: { eventSlug: string; title: string; action: string }[] = [];
      for (const event of body.events) {
        const created = await prisma.directStreamEvent.upsert({
          where: {
            directStreamId_eventSlug: {
              directStreamId: parentStream.id,
              eventSlug: event.eventSlug,
            },
          },
          update: {
            title: event.title,
            scheduledStartAt: event.scheduledStartAt ? new Date(event.scheduledStartAt) : undefined,
            chatEnabled: event.chatEnabled,
            scoreboardEnabled: event.scoreboardEnabled,
            scoreboardHomeTeam: event.scoreboardHomeTeam,
            scoreboardAwayTeam: event.scoreboardAwayTeam,
            scoreboardHomeColor: event.scoreboardHomeColor,
            scoreboardAwayColor: event.scoreboardAwayColor,
          },
          create: {
            directStreamId: parentStream.id,
            eventSlug: event.eventSlug,
            title: event.title,
            scheduledStartAt: event.scheduledStartAt ? new Date(event.scheduledStartAt) : undefined,
            chatEnabled: event.chatEnabled,
            scoreboardEnabled: event.scoreboardEnabled,
            scoreboardHomeTeam: event.scoreboardHomeTeam,
            scoreboardAwayTeam: event.scoreboardAwayTeam,
            scoreboardHomeColor: event.scoreboardHomeColor,
            scoreboardAwayColor: event.scoreboardAwayColor,
          },
        });
        events.push({ eventSlug: created.eventSlug, title: created.title, action: 'upserted' });
      }

      logger.info({ slug: body.slug, events: events.length }, 'DirectStream seed complete');

      const baseUrl = `https://fieldview.live/direct/${body.slug}`;
      res.json({
        success: true,
        parent: { slug: body.slug, url: baseUrl },
        events: events.map((e) => ({
          slug: `${body.slug}/${e.eventSlug}`,
          url: `${baseUrl}/${e.eventSlug}`,
        })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'DirectStream seed failed');
      next(error);
    }
  })();
});

export function createAdminSeedRouter(): express.Router {
  return router;
}
