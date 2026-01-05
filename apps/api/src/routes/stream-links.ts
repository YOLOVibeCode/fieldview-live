import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger';

/**
 * Stream Links (POC)
 *
 * Server-side, shared stream URL storage for stable public links like:
 * /StormFC/2010, /StormFC/2008
 *
 * NOTE: In-memory store; redeploy/restart will clear it.
 */
const router = Router();

const streamStore = new Map<string, string>();

const PathParamsSchema = z.object({
  org: z.string().min(1).max(50),
  team: z.string().min(1).max(50),
});

const UpdateStreamSchema = z.object({
  streamUrl: z.string().url(),
  password: z.string().optional(),
});

function keyFor(org: string, team: string): string {
  return `${org.trim().toLowerCase()}/${team.trim().toLowerCase()}`;
}

// GET /api/streams/:org/:team
router.get(
  '/:org/:team',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const params = PathParamsSchema.parse(req.params);
        const key = keyFor(params.org, params.team);

        const streamUrl = streamStore.get(key);
        if (!streamUrl) {
          return res.status(404).json({ error: 'No stream configured' });
        }

        return res.json({ streamUrl });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error({ error, params: req.params }, 'Failed to get stream URL');
        next(error);
      }
    })();
  }
);

// POST /api/streams/:org/:team
router.post(
  '/:org/:team',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const params = PathParamsSchema.parse(req.params);
        const body = UpdateStreamSchema.parse(req.body);

        const expectedPassword =
          process.env.STREAM_LINK_ADMIN_PASSWORD || process.env.TCHS_ADMIN_PASSWORD || 'tchs2026';

        if (body.password !== expectedPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }

        const key = keyFor(params.org, params.team);
        streamStore.set(key, body.streamUrl);

        logger.info({ org: params.org, team: params.team, streamUrl: body.streamUrl }, 'Stream link updated');
        return res.json({ success: true, streamUrl: body.streamUrl });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error({ error, params: req.params }, 'Failed to update stream URL');
        next(error);
      }
    })();
  }
);

export function createStreamLinksRouter(): Router {
  return router;
}



