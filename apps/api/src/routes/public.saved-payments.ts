/**
 * Saved Payment Methods Routes
 *
 * Public API for retrieving saved payment methods for a customer (relay Connect Hub).
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { getRelayConfig } from '../lib/relay';
import { validateRequest } from '../middleware/validation';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { RelayConnectHubService } from '../services/RelayConnectHubService';
import { RelaySavedPaymentService } from '../services/RelaySavedPaymentService';

const router = express.Router();

const QuerySchema = z.object({
  purchaseId: z.string().uuid(),
});

/**
 * GET /api/public/saved-payments
 *
 * Get saved payment methods for a purchase (scoped to the purchase recipient owner).
 * Query param: ?purchaseId=uuid
 */
router.get(
  '/saved-payments',
  validateRequest({ query: QuerySchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const { purchaseId } = req.query as z.infer<typeof QuerySchema>;

        const purchase = await prisma.purchase.findUnique({
          where: { id: purchaseId },
          select: {
            viewerId: true,
            recipientOwnerAccountId: true,
          },
        });

        if (!purchase?.recipientOwnerAccountId) {
          return res.json({ paymentMethods: [] });
        }

        const ownerAccountRepo = new OwnerAccountRepository(prisma);
        const owner = await ownerAccountRepo.findById(purchase.recipientOwnerAccountId);
        if (!owner?.relayRecipientKey) {
          return res.json({ paymentMethods: [] });
        }

        const relayService = new RelayConnectHubService(getRelayConfig());
        const savedPaymentService = new RelaySavedPaymentService(prisma, relayService);
        const paymentMethods = await savedPaymentService.listSavedPaymentMethodsForOwner({
          recipientKey: owner.relayRecipientKey,
          ownerAccountId: owner.id,
          viewerId: purchase.viewerId,
        });

        res.json({ paymentMethods });
      } catch (error) {
        next(error);
      }
    })();
  },
);

export function createPublicSavedPaymentsRouter(): Router {
  return router;
}
