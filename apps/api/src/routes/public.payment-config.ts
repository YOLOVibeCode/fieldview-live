/**
 * Public Payment Config Route — legacy Square SDK only; relay uses Stripe Checkout redirect.
 */

import express, { type Router } from 'express';

import { prisma } from '../lib/prisma';
import { isPaymentsViaRelay } from '../lib/relay';

const router = express.Router();

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
      if (isPaymentsViaRelay() && owner?.relayRecipientKey) {
        return res.json({ provider: 'stripe_checkout' });
      }

      return res.json({ provider: 'legacy' });
    } catch (error) {
      next(error);
    }
  })();
});

export function createPublicPaymentConfigRouter(): Router {
  return router;
}
