/**
 * Public Watch Link Routes
 *
 * Resolves /watch/{org}/{team}/{eventCode?} to the current stream behind the link.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { EventRepository } from '../repositories/implementations/EventRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
import { WatchLinkService } from '../services/WatchLinkService';

const router = express.Router();

const QuerySchema = z.object({
  code: z.string().min(1).max(32).optional(),
});

/**
 * GET /api/public/watch-links/:orgShortName/:teamSlug
 *
 * Optional query param: ?code=EVENTCODE
 */
router.get(
  '/watch-links/:orgShortName/:teamSlug',
  validateRequest({ query: QuerySchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const orgShortName = req.params.orgShortName;
        const teamSlug = req.params.teamSlug;
        if (!orgShortName || !teamSlug) throw new BadRequestError('Missing org/team');

        // Keep behavior consistent with `lib/jwt.ts` local-dev fallback.
        const ipHashSecret =
          process.env.WATCH_LINK_IP_HASH_SECRET ?? process.env.JWT_SECRET ?? 'change-me-in-production';

        const repo = new WatchLinkRepository(prisma);
        const eventRepo = new EventRepository(prisma);
        const service = WatchLinkService.fromRepos(repo, repo, eventRepo, {
          ipHashSecret,
          enforceIpBindingWhenCodeProvided: true,
        });

        const query = req.query as z.infer<typeof QuerySchema>;
        const result = await service.getPublicBootstrap({
          orgShortName,
          teamSlug,
          eventCode: query.code,
          viewerIp: req.ip ?? null,
        });

        res.json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicWatchLinksRouter(): Router {
  return router;
}


