/**
 * Public Watch Link Routes
 *
 * Resolves /watch/{org}/{team}/{eventCode?} to the current stream behind the link.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { BadRequestError } from '../lib/errors';
import { checkoutRateLimit } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
import { WatchLinkService } from '../services/WatchLinkService';

const router = express.Router();

const QuerySchema = z.object({
  code: z.string().min(1).max(32).optional(),
});

const CheckoutBodySchema = z.object({
  viewerEmail: z.string().email(),
  viewerPhone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  code: z.string().min(4).max(32).optional(),
  returnUrl: z.string().url().optional(),
});

// Lazy initialization
let watchLinkServiceInstance: WatchLinkService | null = null;

function getWatchLinkService(): WatchLinkService {
  if (!watchLinkServiceInstance) {
    const ipHashSecret = process.env.WATCH_LINK_IP_HASH_SECRET ?? process.env.JWT_SECRET;
    if (!ipHashSecret) throw new Error('WATCH_LINK_IP_HASH_SECRET or JWT_SECRET must be set');

    const repo = new WatchLinkRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    watchLinkServiceInstance = WatchLinkService.withCheckout(
      repo,
      repo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      {
        ipHashSecret,
        enforceIpBindingWhenCodeProvided: true,
      }
    );
  }
  return watchLinkServiceInstance;
}

// Export for testing
export function setWatchLinkService(service: WatchLinkService): void {
  watchLinkServiceInstance = service;
}

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

        const ipHashSecret = process.env.WATCH_LINK_IP_HASH_SECRET ?? process.env.JWT_SECRET;
        if (!ipHashSecret) throw new Error('WATCH_LINK_IP_HASH_SECRET or JWT_SECRET must be set');

        const repo = new WatchLinkRepository(prisma);
        const service = WatchLinkService.fromRepos(repo, repo, {
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

/**
 * POST /api/public/watch-links/:orgShortName/:teamSlug/checkout
 *
 * Creates checkout for pay_per_view watch link
 */
router.post(
  '/watch-links/:orgShortName/:teamSlug/checkout',
  checkoutRateLimit,
  validateRequest({ body: CheckoutBodySchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const orgShortName = req.params.orgShortName;
        const teamSlug = req.params.teamSlug;
        if (!orgShortName || !teamSlug) throw new BadRequestError('Missing org/team');

        const body = req.body as z.infer<typeof CheckoutBodySchema>;
        const service = getWatchLinkService();

        const result = await service.createCheckout(
          orgShortName,
          teamSlug,
          body.viewerEmail,
          body.viewerPhone,
          body.code,
          body.returnUrl
        );

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


