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

const router = express.Router();

const UnlockViewerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  wantsReminders: z.boolean().optional().default(true),
});

/**
 * POST /api/public/direct/:slug/viewer/unlock
 *
 * Unlock a direct stream for a viewer by creating/updating their identity.
 * Returns a viewer JWT token scoped to the gameId for chat + stream access.
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

        // Get gameId from slug (requires bootstrap call first or lookup)
        // For now, lookup the gameId from the direct mapping or create it
        const gameIdLookup = await prisma.game.findFirst({
          where: {
            title: `Direct Stream: ${slug}`,
          },
          select: { id: true },
        });

        if (!gameIdLookup) {
          throw new BadRequestError('Game not found for this stream. Please refresh the page.');
        }

        const gameId = gameIdLookup.id;

        // Get DirectStream for email notifications
        const directStream = await prisma.directStream.findUnique({
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
        if (directStream && viewer.wantsReminders) {
          const streamUrl = `${process.env.WEB_URL || 'http://localhost:4300'}/direct/${slug}`;
          
          try {
            const html = renderRegistrationEmail({
              firstName: viewer.firstName || 'Viewer',
              streamTitle: directStream.title,
              streamUrl,
              scheduledStartAt: directStream.scheduledStartAt || undefined,
            });

            // Send email asynchronously (don't block response)
            void sendEmail({
              to: viewer.email,
              subject: `You're registered for ${directStream.title}`,
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

export function createDirectViewerRouter(): Router {
  return router;
}

