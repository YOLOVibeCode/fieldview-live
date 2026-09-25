/**
 * Public Payment Config Route.
 *
 * Returns the Square Web Payments SDK config for a purchase's recipient (coach),
 * sourced from the relay Connect Hub's per-recipient frontend-config.
 */

import express, { type Router } from 'express';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getRelayConfig } from '../lib/relay';
import type { IRelayConnectOnboarding } from '../services/IRelayConnectHubService';
import { RelayConnectHubService } from '../services/RelayConnectHubService';

const router = express.Router();

let relayServiceInstance: IRelayConnectOnboarding | null = null;

function getRelayService(): IRelayConnectOnboarding {
  if (!relayServiceInstance) {
    relayServiceInstance = new RelayConnectHubService(getRelayConfig());
  }
  return relayServiceInstance;
}

export function setRelayService(service: IRelayConnectOnboarding): void {
  relayServiceInstance = service;
}

/**
 * GET /api/public/purchases/:purchaseId/payment-config
 */
router.get('/purchases/:purchaseId/payment-config', (req, res, next) => {
  void (async () => {
    try {
      const { purchaseId } = req.params;
      const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
      if (!purchase) {
        return next(new NotFoundError('Purchase not found'));
      }

      if (!purchase.recipientOwnerAccountId) {
        return next(new BadRequestError('Purchase has no recipient coach'));
      }

      const owner = await prisma.ownerAccount.findUnique({
        where: { id: purchase.recipientOwnerAccountId },
      });
      if (!owner?.relayRecipientKey) {
        return next(new BadRequestError('Coach has not connected payments via the relay'));
      }

      const cfg = await getRelayService().getFrontendConfig(owner.relayRecipientKey);
      const locationId =
        (cfg.locationId?.trim() || owner.squareLocationId?.trim() || '') || null;
      if (!locationId) {
        return next(new BadRequestError('Coach Square location is not configured'));
      }

      return res.json({
        provider: 'relay',
        applicationId: cfg.applicationId,
        environment: cfg.environment,
        locationId,
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createPublicPaymentConfigRouter(): Router {
  return router;
}
