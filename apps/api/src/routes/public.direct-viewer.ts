/**
 * Direct Stream Viewer Routes (unlock + viewer identity)
 *
 * Handles viewer unlock flow for direct streams with chat.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { generateViewerToken, formatDisplayName } from '../lib/viewer-jwt';
import { logger } from '../lib/logger';
import { sendEmail, renderRegistrationEmail } from '../lib/email';
import { createAutoRegistrationService } from '../services/auto-registration.implementations';
import type { AutoRegisterRequest, AutoRegisterResponse } from '../services/auto-registration.interfaces';

const router = express.Router();

const UnlockViewerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  wantsReminders: z.boolean().optional().default(true),
});

const AutoRegisterSchema = z.object({
  directStreamSlug: z.string().min(1),
  viewerIdentityId: z.string().min(1),
});

/**
 * Ensures a Game record exists for a DirectStream.
 * Creates one automatically if missing (resilient design).
 * 
 * @param slug - DirectStream slug
 * @param directStream - DirectStream record (must include ownerAccountId)
 * @returns Game ID (existing or newly created)
 */
async function ensureGameForDirectStream(
  slug: string,
  directStream: { id: string; title: string; ownerAccountId: string; scheduledStartAt: Date | null; priceInCents: number }
): Promise<string> {
  const gameTitle = `Direct Stream: ${slug}`;
  
  // Try to find existing Game
  const existingGame = await prisma.game.findFirst({
    where: { title: gameTitle },
    select: { id: true },
  });

  if (existingGame) {
    return existingGame.id;
  }

  // Auto-create Game record (resilient fallback)
  logger.warn({ slug, directStreamId: directStream.id }, 'Game record missing for DirectStream - auto-creating');

  // Generate unique keyword code using slug + timestamp
  const keywordCode = `DIRECT-${slug.toUpperCase()}-${Date.now()}`;

  const newGame = await prisma.game.create({
    data: {
      ownerAccountId: directStream.ownerAccountId,
      title: gameTitle,
      homeTeam: directStream.title || slug,
      awayTeam: 'TBD',
      startsAt: directStream.scheduledStartAt || new Date(),
      priceCents: directStream.priceInCents || 0,
      currency: 'USD',
      keywordCode,
      qrUrl: `https://fieldview.live/direct/${slug}`,
      state: 'active',
    },
  });

  // Link the Game back to the DirectStream so bootstrap returns the correct gameId
  await prisma.directStream.update({
    where: { id: directStream.id },
    data: { gameId: newGame.id },
  });

  logger.info(
    { slug, gameId: newGame.id, directStreamId: directStream.id },
    'Game record auto-created and linked to DirectStream'
  );

  return newGame.id;
}

/**
 * POST /api/public/direct/:slug/viewer/unlock
 *
 * Unlock a direct stream for a viewer by creating/updating their identity.
 * Returns a viewer JWT token scoped to the gameId for chat + stream access.
 * 
 * Resilient design: Auto-creates Game record if missing.
 */
router.post(
  '/direct/:slug/viewer/unlock',
  validateRequest({ body: UnlockViewerSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const { slug } = req.params;
        if (!slug) {
          throw new BadRequestError('Slug is required');
        }

        const body = req.body as z.infer<typeof UnlockViewerSchema>;

        // Get DirectStream first (needed for email notifications AND Game auto-creation)
        const directStream = await prisma.directStream.findUnique({
          where: { slug },
          select: {
            id: true,
            title: true,
            ownerAccountId: true,
            scheduledStartAt: true,
            priceInCents: true,
          },
        });

        if (!directStream) {
          throw new BadRequestError('Stream not found. Please check the URL.');
        }

        // Ensure Game exists (resilient - creates if missing)
        const gameId = await ensureGameForDirectStream(slug, directStream);

        // Get full DirectStream for email (with all fields)
        const directStreamFull = await prisma.directStream.findUnique({
          where: { slug },
        });

        // Upsert viewer identity
        const viewer = await prisma.viewerIdentity.upsert({
          where: { email: body.email.toLowerCase().trim() },
          update: {
            firstName: body.firstName,
            lastName: body.lastName,
            lastSeenAt: new Date(),
            wantsReminders: body.wantsReminders ?? true,
          },
          create: {
            email: body.email.toLowerCase().trim(),
            firstName: body.firstName,
            lastName: body.lastName,
            lastSeenAt: new Date(),
            wantsReminders: body.wantsReminders ?? true,
          },
        });

        // Send registration confirmation email
        if (directStreamFull && viewer.wantsReminders) {
          const streamUrl = `${process.env.WEB_URL || 'http://localhost:4300'}/direct/${slug}`;
          
          try {
            const html = renderRegistrationEmail({
              firstName: viewer.firstName || 'Viewer',
              streamTitle: directStreamFull.title,
              streamUrl,
              scheduledStartAt: directStreamFull.scheduledStartAt || undefined,
            });

            // Send email asynchronously (don't block response)
            void sendEmail({
              to: viewer.email,
              subject: `You're registered for ${directStreamFull.title}`,
              html,
            });
          } catch (emailError) {
            // Log but don't fail the unlock request
            logger.error({ emailError, viewerId: viewer.id }, 'Failed to send registration email');
          }
        }

        // Format display name for privacy
        const displayName = formatDisplayName(body.firstName, body.lastName);

        // Generate viewer token
        const viewerToken = generateViewerToken({
          viewerId: viewer.id,
          gameId,
          slug,
          displayName,
        });

        logger.info(
          { viewerId: viewer.id, gameId, slug, displayName },
          'Viewer unlocked direct stream'
        );

        res.json({
          viewerToken,
          viewer: {
            id: viewer.id,
            email: viewer.email,
            displayName,
          },
          gameId,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/public/direct/viewer/auto-register
 *
 * Auto-register an existing viewer for a new direct stream.
 * Used for cross-stream authentication - if a viewer is already registered
 * on one stream, they can be automatically registered on other streams.
 */
router.post(
  '/direct/viewer/auto-register',
  validateRequest({ body: AutoRegisterSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const body = req.body as AutoRegisterRequest;

        // Create auto-registration service
        const autoRegService = createAutoRegistrationService(prisma);

        // Auto-register viewer
        const result = await autoRegService.autoRegister(
          body.directStreamSlug,
          body.viewerIdentityId
        );

        // Format response
        const response: AutoRegisterResponse = {
          registration: {
            id: result.registration.id,
            directStreamId: result.registration.directStreamId,
            viewerIdentityId: result.registration.viewerIdentityId,
            registeredAt: result.registration.registeredAt.toISOString(),
            accessToken: null, // No longer storing access tokens in DB
            viewerIdentity: {
              id: result.registration.viewerIdentity.id,
              email: result.registration.viewerIdentity.email,
              firstName: result.registration.viewerIdentity.firstName,
              lastName: result.registration.viewerIdentity.lastName,
            },
          },
          isNewRegistration: result.isNewRegistration,
        };

        logger.info(
          {
            streamSlug: body.directStreamSlug,
            viewerIdentityId: body.viewerIdentityId,
            isNewRegistration: result.isNewRegistration,
          },
          'Viewer auto-registered for stream'
        );

        // Return 201 for new registration, 200 for existing
        res.status(result.isNewRegistration ? 201 : 200).json(response);
      } catch (error) {
        // Handle specific errors
        if (error instanceof Error) {
          if (error.message.includes('Stream not found')) {
            return res.status(404).json({ error: error.message });
          }
          if (error.message.includes('Viewer identity not found')) {
            return res.status(404).json({ error: error.message });
          }
        }

        // Log and return generic error
        logger.error({ error, body: req.body }, 'Auto-registration failed');
        res.status(500).json({ error: 'Auto-registration failed' });
      }
    })();
  }
);

export function createDirectViewerRouter(): Router {
  return router;
}

