/**
 * Saved Payment Methods Routes
 *
 * Public API for retrieving saved payment methods for a customer.
 * 
 * IMPORTANT: This endpoint does NOT store payment data. It fetches card
 * information from Square's API on-demand. Only safe display data (last4,
 * brand, expiry) is returned - no sensitive card numbers or CVV are ever
 * stored or returned.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { SquareCustomerService } from '../services/SquareCustomerService';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { SquareOwnerClientService } from '../services/SquareOwnerClientService';

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
        if (!owner) {
          return res.json({ paymentMethods: [] });
        }

        const ownerSquareClientService = new SquareOwnerClientService(ownerAccountRepo);
        const ownerSquareClient = await ownerSquareClientService.getClient(owner);
        if (!ownerSquareClient) {
          return res.json({ paymentMethods: [] });
        }

        const squareCustomerService = new SquareCustomerService(prisma);
        const paymentMethods = await squareCustomerService.listSavedPaymentMethodsForOwner({
          ownerAccountId: owner.id,
          viewerId: purchase.viewerId,
          squareClient: ownerSquareClient,
        });

        res.json({ paymentMethods });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicSavedPaymentsRouter(): Router {
  return router;
}


