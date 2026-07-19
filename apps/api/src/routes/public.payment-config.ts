/**
 * Public Payment Config Route.
 *
 * Returns the Square Web Payments SDK config for a purchase's recipient (coach),
 * sourced from the relay Connect Hub's per-recipient frontend-config. This lets the
 * checkout page tokenize against the COACH's seller context (fixing the legacy
 * global-location mismatch).
 *
 * Falls back to `{ provider: 'legacy' }` when the owner has not connected via the
 * relay, so the frontend can keep using NEXT_PUBLIC_SQUARE_* during the transition.
 *
 * See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import express, { type Router } from 'express';

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
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } });
      }

      if (!purchase.recipientOwnerAccountId) {
        return res.json({ provider: 'legacy' });
      }

      const owner = await prisma.ownerAccount.findUnique({
        where: { id: purchase.recipientOwnerAccountId },
      });
      if (!owner?.relayRecipientKey) {
        return res.json({ provider: 'legacy' });
      }

      const cfg = await getRelayService().getFrontendConfig(owner.relayRecipientKey);
      return res.json({
        provider: 'relay',
        applicationId: cfg.applicationId,
        environment: cfg.environment,
        locationId: cfg.locationId ?? null,
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createPublicPaymentConfigRouter(): Router {
  return router;
}
