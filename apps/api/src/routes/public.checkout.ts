/**
 * Public Checkout Routes
 * 
 * Handles public checkout endpoints (no auth required).
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { checkoutRateLimit } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
import { PaymentService } from '../services/PaymentService';

const router = express.Router();

// Lazy initialization
let paymentServiceInstance: PaymentService | null = null;

function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const watchLinkRepo = new WatchLinkRepository(prisma);
    paymentServiceInstance = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      watchLinkRepo
    );
  }
  return paymentServiceInstance;
}

// Export for testing
export function setPaymentService(service: PaymentService): void {
  paymentServiceInstance = service;
}

// Checkout request schema (viewerEmail required)
const CheckoutCreateSchema = z.object({
  viewerEmail: z.string().email(),
  viewerPhone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  returnUrl: z.string().url().optional(),
});

/**
 * POST /api/public/games/:gameId/checkout
 * 
 * Create checkout with Square (supports Apple Pay, Google Pay).
 */
router.post(
  '/games/:gameId/checkout',
  checkoutRateLimit,
  validateRequest({ body: CheckoutCreateSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const gameId = req.params.gameId;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing gameId' } });
        }

        const body = req.body as z.infer<typeof CheckoutCreateSchema>;
        const paymentService = getPaymentService();

        const result = await paymentService.createCheckout(
          gameId,
          body.viewerEmail,
          body.viewerPhone,
          body.returnUrl
        );

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
 * Create checkout for watch link channel (supports Apple Pay, Google Pay).
 */
router.post(
  '/watch-links/:orgShortName/:teamSlug/checkout',
  checkoutRateLimit,
  validateRequest({ body: CheckoutCreateSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const orgShortName = req.params.orgShortName;
        const teamSlug = req.params.teamSlug;
        if (!orgShortName || !teamSlug) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing orgShortName or teamSlug' } });
        }

        const body = req.body as z.infer<typeof CheckoutCreateSchema>;
        const paymentService = getPaymentService();

        // Get channel ID from org/team
        const watchLinkRepo = new WatchLinkRepository(prisma);
        const org = await watchLinkRepo.getOrganizationByShortName(orgShortName);
        if (!org) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
        }

        const channel = await watchLinkRepo.getChannelByOrgIdAndTeamSlug(org.id, teamSlug);
        if (!channel) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Channel not found' } });
        }

        const result = await paymentService.createChannelCheckout(
          channel.id,
          body.viewerEmail,
          body.viewerPhone,
          body.returnUrl
        );

        res.json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicRouter(): Router {
  return router;
}
