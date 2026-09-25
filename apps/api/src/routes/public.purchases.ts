/**
 * Public Purchases Routes — store marketplace checkout sessions.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { buildReceiptStreamUrl } from '../lib/receipt-stream-url';
import { getMarketplaceConfig, resolveSellerKey } from '../lib/marketplace';
import { validateRequest } from '../middleware/validation';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { MarketplaceStoreService } from '../services/MarketplaceStoreService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

interface PublicPurchaseHandlers {
  get(purchaseId: string): Promise<{ id: string; amountCents: number; currency: string; status: string; viewerEmail?: string }>;
  getStatus(purchaseId: string): Promise<{
    purchaseId: string;
    status: string;
    entitlementToken?: string;
    watchUrl?: string;
  }>;
  createCheckoutSession(
    purchaseId: string,
    opts?: { returnUrl?: string },
  ): Promise<{ checkoutUrl: string; status: string }>;
}

let handlersInstance: PublicPurchaseHandlers | null = null;
let storeServiceInstance: MarketplaceStoreService | null = null;

function getStoreService(): MarketplaceStoreService {
  if (!storeServiceInstance) {
    storeServiceInstance = new MarketplaceStoreService(getMarketplaceConfig());
  }
  return storeServiceInstance;
}

export function setMarketplaceStorePaymentsService(service: MarketplaceStoreService): void {
  storeServiceInstance = service;
}

function getHandlers(): PublicPurchaseHandlers {
  if (!handlersInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const ownerAccountRepo = new OwnerAccountRepository(prisma);

    handlersInstance = {
      async get(purchaseId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }
        const viewer = await prisma.viewerIdentity.findUnique({
          where: { id: purchase.viewerId },
          select: { email: true },
        });
        return {
          id: purchase.id,
          amountCents: purchase.amountCents,
          currency: purchase.currency,
          status: purchase.status,
          viewerEmail: viewer?.email,
        };
      },

      async getStatus(purchaseId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }
        const entitlement = await entitlementRepo.getByPurchaseId(purchaseId);
        const entitlementToken = entitlement?.tokenId;
        const watchUrl = entitlementToken
          ? await buildReceiptStreamUrl(purchase, entitlementToken)
          : undefined;
        return {
          purchaseId,
          status: purchase.status,
          entitlementToken,
          watchUrl,
        };
      },

      async createCheckoutSession(purchaseId, opts) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }
        if (purchase.status === 'paid') {
          return { checkoutUrl: `${APP_URL}/checkout/${purchaseId}/success`, status: 'paid' };
        }
        if (purchase.status !== 'created') {
          throw new BadRequestError(`Purchase is not payable (status=${purchase.status})`);
        }
        if (!purchase.recipientOwnerAccountId) {
          throw new BadRequestError('Purchase missing recipient owner account');
        }

        const ownerAccount = await ownerAccountRepo.findById(purchase.recipientOwnerAccountId);
        if (!ownerAccount) {
          throw new NotFoundError('Owner account not found');
        }

        const sellerKey = resolveSellerKey(ownerAccount);
        const viewer = await prisma.viewerIdentity.findUnique({
          where: { id: purchase.viewerId },
          select: { email: true },
        });

        const successUrl = opts?.returnUrl || `${APP_URL}/checkout/${purchaseId}/success`;
        const cancelUrl = `${APP_URL}/checkout/${purchaseId}/payment?cancelled=1`;

        const session = await getStoreService().createCheckout({
          sellerKey,
          amountCents: purchase.amountCents,
          currency: purchase.currency || 'USD',
          purchaseId,
          successUrl,
          cancelUrl,
          buyerEmail: viewer?.email ?? undefined,
        });

        if (session.paymentId) {
          await purchaseRepo.update(purchaseId, { paymentProviderPaymentId: session.paymentId });
        }

        return { checkoutUrl: session.checkoutUrl, status: 'created' };
      },
    };
  }

  return handlersInstance;
}

export function setPublicPurchaseHandlers(handlers: PublicPurchaseHandlers): void {
  handlersInstance = handlers;
}

const router = express.Router();

const CheckoutSessionSchema = z.object({
  returnUrl: z.string().url().optional(),
});

router.get('/purchases/:purchaseId', (req, res, next) => {
  void (async () => {
    try {
      const purchaseId = req.params.purchaseId;
      if (!purchaseId) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing purchaseId' } });
      }
      const result = await getHandlers().get(purchaseId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  })();
});

router.get('/purchases/:purchaseId/status', (req, res, next) => {
  void (async () => {
    try {
      const purchaseId = req.params.purchaseId;
      if (!purchaseId) {
        throw new NotFoundError('Purchase not found');
      }
      const status = await getHandlers().getStatus(purchaseId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  })();
});

router.post(
  '/purchases/:purchaseId/checkout-session',
  validateRequest({ body: CheckoutSessionSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const purchaseId = req.params.purchaseId;
        if (!purchaseId) {
          throw new NotFoundError('Purchase not found');
        }
        const body = req.body as z.infer<typeof CheckoutSessionSchema>;
        const result = await getHandlers().createCheckoutSession(purchaseId, { returnUrl: body.returnUrl });
        res.json(result);
      } catch (error) {
        next(error);
      }
    })();
  },
);

export function createPublicPurchasesRouter(): Router {
  return router;
}
