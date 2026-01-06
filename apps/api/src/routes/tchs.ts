import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

const router = Router();

// Simple in-memory store as fallback (for quick deployment)
// In production, this could be stored in Redis or DB
const streamStore = new Map<string, string>();

// In-memory store for slug->gameId mapping (for chat)
const slugGameMap = new Map<string, string>();

const UpdateStreamSchema = z.object({
  slug: z.string().min(1).max(50),
  streamUrl: z.string().url(),
  password: z.string().optional(),
});

function keyFor(slug: string): string {
  return slug.trim().toLowerCase();
}

// GET /api/tchs/:slug/bootstrap - Get bootstrap data (stream + chat)
// MUST come before /:slug route!
router.get(
  '/:slug/bootstrap',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        
        if (!slug) {
          return res.status(400).json({ error: 'Slug is required' });
        }

        const key = keyFor(slug);
        const streamUrl = streamStore.get(key);
        const gameId = slugGameMap.get(key);

        // Try to find or create a Game for this stream
        let associatedGameId = gameId || null;
        let chatEnabled = false;

        if (!associatedGameId) {
          // Create a placeholder Game for chat (if one doesn't exist)
          try {
            // Find owner account for TCHS
            const owner = await prisma.ownerAccount.findFirst({
              where: { 
                OR: [
                  { contactEmail: { contains: 'tchs', mode: 'insensitive' } },
                  { name: { contains: 'TCHS', mode: 'insensitive' } }
                ]
              }
            });

            if (owner) {
              // Check if game already exists for this slug
              // Note: Using keywordCode as a unique identifier for TCHS streams
              const streamKey = `tchs-${slug}`;
              
              const existingGame = await prisma.game.findFirst({
                where: {
                  ownerAccountId: owner.id,
                  keywordCode: streamKey,
                }
              });

              if (existingGame) {
                associatedGameId = existingGame.id;
                slugGameMap.set(key, existingGame.id);
                chatEnabled = true;
              } else {
                // Create new game for this stream
                // Parse team from slug (e.g., "tchs-20260106-soccerjv")
                const parts = slug.split('-');
                const team = parts.slice(2).join(' ') || 'Unknown';
                
                const newGame = await prisma.game.create({
                  data: {
                    ownerAccountId: owner.id,
                    title: `TCHS ${team}`,
                    homeTeam: team,
                    awayTeam: 'TBD',
                    startsAt: new Date(),
                    state: 'live',
                    priceCents: 0, // Free for TCHS POC
                    currency: 'USD',
                    keywordCode: streamKey,
                    qrUrl: `https://fieldview.live/direct/tchs/${slug}`,
                  }
                });
                associatedGameId = newGame.id;
                slugGameMap.set(key, newGame.id);
                chatEnabled = true;
              }
            }
          } catch (dbError) {
            logger.warn({ error: dbError, slug }, 'Failed to create/find Game for TCHS stream');
            // Continue without chat if DB fails
          }
        } else {
          chatEnabled = true;
        }

        return res.json({
          slug,
          gameId: associatedGameId,
          streamUrl: streamUrl || null,
          chatEnabled,
          title: 'TCHS Live Stream',
        });
      } catch (error) {
        logger.error({ error, slug: req.params.slug }, 'Failed to get bootstrap data');
        next(error);
      }
    })();
  }
);

// GET /api/tchs/:slug - Get current stream URL (legacy endpoint)
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
        const streamUrl = streamStore.get(keyFor(slug));
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

// POST /api/tchs/:slug - Update stream URL
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

        // Simple password protection (you can change this)
        const expectedPassword = (process.env.TCHS_ADMIN_PASSWORD || 'tchs2026').trim();
        const providedPassword = (body.password || '').trim();
        if (!providedPassword || providedPassword !== expectedPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Store in memory (simple, works immediately)
        streamStore.set(keyFor(slug), body.streamUrl);

        logger.info({ slug, streamUrl: body.streamUrl }, 'Stream URL updated');

        res.json({ success: true, streamUrl: body.streamUrl });
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

export function createTchsRouter(): Router {
  return router;
}

