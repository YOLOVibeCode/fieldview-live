import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

const router = Router();

// Simple in-memory store for direct stream links
// In production, this could be stored in Redis or DB
const streamStore = new Map<string, string>();

// In-memory store for slug->gameId mapping (POC, could be DB-backed)
const slugGameMap = new Map<string, string>();

const UpdateStreamSchema = z.object({
  slug: z.string().min(1).max(50),
  streamUrl: z.string().url(),
  gameId: z.string().uuid().optional(), // Optional gameId for chat association
  password: z.string().optional(),
});

// GET /api/direct/:slug/bootstrap - Get bootstrap data for direct stream page
router.get(
  '/:slug/bootstrap',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const key = slug.toLowerCase();
        const streamUrl = streamStore.get(key);
        const gameId = slugGameMap.get(key);
        
        // If no gameId associated, try to find or create a placeholder game
        let resolvedGameId = gameId;
        if (!resolvedGameId) {
          // For POC, create a placeholder game if none exists
          // In production, this would require owner setup
          const existingGame = await prisma.game.findFirst({
            where: {
              title: `Direct Stream: ${slug}`,
            },
            select: { id: true },
          });

          if (existingGame) {
            resolvedGameId = existingGame.id;
            slugGameMap.set(key, resolvedGameId);
          } else {
            // Create placeholder game (requires ownerAccountId)
            // For POC, use a default owner or require setup
            const defaultOwner = await prisma.ownerAccount.findFirst({
              select: { id: true },
            });

            if (defaultOwner) {
              const newGame = await prisma.game.create({
                data: {
                  ownerAccountId: defaultOwner.id,
                  title: `Direct Stream: ${slug}`,
                  homeTeam: slug,
                  awayTeam: 'TBD',
                  startsAt: new Date(),
                  priceCents: 0,
                  currency: 'USD',
                  keywordCode: `DIRECT-${slug.toUpperCase()}-${Date.now()}`,
                  qrUrl: '',
                  state: 'live',
                },
              });
              resolvedGameId = newGame.id;
              slugGameMap.set(key, resolvedGameId);
            }
          }
        }

        return res.json({
          slug,
          gameId: resolvedGameId || null,
          streamUrl: streamUrl || null,
          chatEnabled: true,
          title: `Direct Stream: ${slug}`,
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get bootstrap data');
        next(error);
      }
    })();
  }
);

// GET /api/direct/:slug - Get current stream URL (legacy, keep for compatibility)
router.get(
  '/:slug',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        // Use in-memory store (simple and fast)
        const streamUrl = streamStore.get(slug.toLowerCase());
        if (streamUrl) {
          return res.json({ streamUrl });
        }

        res.status(404).json({ error: 'No stream configured' });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get stream URL');
        next(error);
      }
    })();
  }
);

// POST /api/direct/:slug - Update stream URL
router.post(
  '/:slug',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }
        
        const body = UpdateStreamSchema.parse({ slug, ...req.body });

        // Password protection - use admin2026 for StormFC (case-insensitive)
        const expectedPassword = (process.env.DIRECT_ADMIN_PASSWORD || 'admin2026').toLowerCase().trim();
        const providedPassword = (body.password || '').toLowerCase().trim();
        
        if (!body.password || providedPassword !== expectedPassword) {
          logger.warn({ slug, providedPassword: body.password ? '***' : 'missing' }, 'Invalid password attempt');
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Store in memory (simple, works immediately)
        const key = slug.toLowerCase();
        streamStore.set(key, body.streamUrl);
        
        // Store gameId if provided
        if (body.gameId) {
          slugGameMap.set(key, body.gameId);
        }

        logger.info({ slug, streamUrl: body.streamUrl, gameId: body.gameId }, 'Direct stream URL updated');

        res.json({ success: true, streamUrl: body.streamUrl, gameId: body.gameId });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error({ error, slug: req.params.slug }, 'Failed to update stream URL');
        next(error);
      }
    })();
  }
);

export function createDirectRouter(): Router {
  return router;
}

