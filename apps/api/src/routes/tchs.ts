import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

// Simple in-memory store as fallback (for quick deployment)
// In production, this could be stored in Redis or DB
const streamStore = new Map<string, string>();

const UpdateStreamSchema = z.object({
  slug: z.string().min(1).max(50),
  streamUrl: z.string().url(),
  password: z.string().optional(),
});

// GET /api/tchs/:slug - Get current stream URL
router.get(
  '/:slug',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;

        // Use in-memory store (simple and fast)
        const streamUrl = streamStore.get(slug);
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
        const body = UpdateStreamSchema.parse({ slug, ...req.body });

        // Simple password protection (you can change this)
        const expectedPassword = process.env.TCHS_ADMIN_PASSWORD || 'tchs2026';
        if (body.password !== expectedPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        // Store in memory (simple, works immediately)
        streamStore.set(slug, body.streamUrl);

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

