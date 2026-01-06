/**
 * Universal Viewer Unlock Route
 * 
 * Works with any game type - just needs a gameId.
 * Creates/updates ViewerIdentity and issues scoped JWT token.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { generateViewerToken, formatDisplayName } from '../lib/viewer-jwt';
import { logger } from '../lib/logger';

const router = express.Router();

const UnlockViewerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

/**
 * POST /api/public/games/:gameId/viewer/unlock
 * 
 * Universal unlock endpoint for any game type.
 * Returns viewer JWT token scoped to the gameId.
 */
router.post(
  '/games/:gameId/viewer/unlock',
  validateRequest({ body: UnlockViewerSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const { gameId } = req.params;
        if (!gameId) {
          throw new BadRequestError('Game ID is required');
        }

        const body = req.body as z.infer<typeof UnlockViewerSchema>;

        // Verify game exists
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          select: { id: true, title: true },
        });

        if (!game) {
          throw new NotFoundError('Game not found');
        }

        // Upsert viewer identity
        const viewer = await prisma.viewerIdentity.upsert({
          where: { email: body.email.toLowerCase().trim() },
          update: {
            firstName: body.firstName,
            lastName: body.lastName,
            lastSeenAt: new Date(),
          },
          create: {
            email: body.email.toLowerCase().trim(),
            firstName: body.firstName,
            lastName: body.lastName,
            lastSeenAt: new Date(),
          },
        });

        // Format display name for privacy
        const displayName = formatDisplayName(body.firstName, body.lastName);

        // Generate viewer token (scoped to gameId)
        const viewerToken = generateViewerToken({
          viewerId: viewer.id,
          gameId,
          slug: game.title, // Use game title as slug context
          displayName,
        });

        logger.info(
          { viewerId: viewer.id, gameId, displayName },
          'Viewer unlocked game stream'
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

export function createPublicGameViewerRouter(): Router {
  return router;
}

