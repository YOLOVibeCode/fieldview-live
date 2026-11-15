/**
 * Live stream search for a Direct Stream admin.
 *
 * GET /api/direct/:slug/live-streams — "what is live right now on the camera
 * platforms this stream's owner has connected?" Admin JWT required.
 * Returns titles and playable URLs only — never a credential.
 */

import { Router, type NextFunction, type Request, type Response } from 'express';

import { parseDirectKey } from '../lib/direct-slug';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { validateAdminToken } from '../middleware/admin-jwt';
import { liveStreamSearchRateLimit } from '../middleware/rateLimit';
import { liveStreamFinder, type ILiveStreamFinder } from '../modules/camera-sources';

export interface DirectLiveStreamsRouterDeps {
  finder?: ILiveStreamFinder;
}

export function createDirectLiveStreamsRouter(deps: DirectLiveStreamsRouterDeps = {}): Router {
  const finder = deps.finder ?? liveStreamFinder;
  const router = Router();

  router.get(
    '/:slug/live-streams',
    validateAdminToken,
    liveStreamSearchRateLimit,
    (req: Request, res: Response, next: NextFunction) => {
      void (async () => {
        try {
          // Game pages arrive as parent/event; camera sources belong to the parent's owner.
          const { parentSlug } = parseDirectKey(req.params.slug ?? '');
          if (!parentSlug) {
            throw new BadRequestError('Slug is required');
          }

          const stream = await prisma.directStream.findUnique({
            where: { slug: parentSlug },
            select: { ownerAccountId: true },
          });
          if (!stream) {
            throw new NotFoundError('Stream not found');
          }

          const found = await finder.findForOwner(stream.ownerAccountId);
          const providerNames = new Map(found.sources.map((s) => [s.provider, s.displayName]));

          res.json({
            streams: found.streams.map((s) => ({
              provider: s.provider,
              providerName: providerNames.get(s.provider) ?? s.provider,
              title: s.title,
              streamUrl: s.streamUrl,
            })),
            sources: found.sources,
          });
        } catch (error) {
          next(error);
        }
      })();
    }
  );

  return router;
}
