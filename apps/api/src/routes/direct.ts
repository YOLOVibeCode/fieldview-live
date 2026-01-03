import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger';

const router = Router();

// Simple in-memory store for direct stream links
// In production, this could be stored in Redis or DB
const streamStore = new Map<string, string>();

const UpdateStreamSchema = z.object({
  slug: z.string().min(1).max(50),
  streamUrl: z.string().url(),
  password: z.string().optional(),
});

// GET /api/direct/:slug - Get current stream URL
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

        // Password protection - use admin2026 for StormFC
        const expectedPassword = process.env.DIRECT_ADMIN_PASSWORD || 'admin2026';
        if (body.password !== expectedPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Store in memory (simple, works immediately)
        streamStore.set(slug.toLowerCase(), body.streamUrl);

        logger.info({ slug, streamUrl: body.streamUrl }, 'Direct stream URL updated');

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

export function createDirectRouter(): Router {
  return router;
}

