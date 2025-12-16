/**
 * Public Purchases Routes
 *
 * Handles public purchase payment processing and status polling (no auth required).
 * Following CDD: Contract matches OpenAPI spec.
 */

import crypto from 'crypto';

import express, { type Router } from 'express';
import { z } from 'zod';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { squareClient, squareLocationId } from '../lib/square';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { validateRequest } from '../middleware/validation';

interface PublicPurchaseHandlers {
  getStatus(purchaseId: string): Promise<{ purchaseId: string; status: string; entitlementToken?: string }>;
  processPayment(purchaseId: string, sourceId: string): Promise<{ purchaseId: string; status: string; entitlementToken?: string }>;
}

// Lazy initialization (allows test injection)
let handlersInstance: PublicPurchaseHandlers | null = null;

function getHandlers(): PublicPurchaseHandlers {
  if (!handlersInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);

    handlersInstance = {
      async getStatus(purchaseId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }
        const entitlement = await entitlementRepo.getByPurchaseId(purchaseId);
        return {
          purchaseId,
          status: purchase.status,
          entitlementToken: entitlement?.tokenId,
        };
      },

      async processPayment(purchaseId: string, sourceId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }

        if (purchase.status !== 'created') {
          throw new BadRequestError(`Purchase is not payable (status=${purchase.status})`);
        }

        if (!squareLocationId) {
          throw new BadRequestError('Square location is not configured');
        }

        // Create Square payment (synchronous capture)
        // Square SDK types vary by version; use minimal fields and tolerate typing via `any`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentsApi: any = (squareClient as any).paymentsApi || (squareClient as any).payments;
        if (!paymentsApi?.createPayment) {
          throw new Error('Square payments API not available');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await paymentsApi.createPayment({
          idempotencyKey: `purchase-${purchaseId}-${Date.now()}`,
          sourceId,
          amountMoney: {
            amount: BigInt(purchase.amountCents),
            currency: purchase.currency || 'USD',
          },
          locationId: squareLocationId,
          autocomplete: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const payment = result?.result?.payment || result?.payment;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const paymentId = payment?.id as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const paymentStatus = payment?.status as string | undefined;

        if (!paymentId) {
          await purchaseRepo.update(purchaseId, { status: 'failed', failedAt: new Date() });
          return { purchaseId, status: 'failed' };
        }

        // Persist provider payment id
        await purchaseRepo.update(purchaseId, {
          paymentProviderPaymentId: paymentId,
        });

        if (paymentStatus && paymentStatus !== 'COMPLETED') {
          // Payment not completed; mark as failed for now (can be expanded to pending state later)
          await purchaseRepo.update(purchaseId, { status: 'failed', failedAt: new Date() });
          return { purchaseId, status: 'failed' };
        }

        // Mark purchase as paid
        await purchaseRepo.update(purchaseId, { status: 'paid', paidAt: new Date() });

        // Ensure entitlement exists
        const existingEntitlement = await entitlementRepo.getByPurchaseId(purchaseId);
        if (existingEntitlement) {
          return {
            purchaseId,
            status: 'paid',
            entitlementToken: existingEntitlement.tokenId,
          };
        }

        // Compute validity: end time if available, else 24 hours from now
        const now = new Date();
        // PurchaseRepository includes `game` relation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const purchaseWithRelations: any = purchase;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const game = purchaseWithRelations.game as { endsAt?: Date | null } | undefined;
        const validTo = game?.endsAt ? new Date(game.endsAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const tokenId = crypto.randomBytes(32).toString('hex');
        const entitlement = await entitlementRepo.create({
          purchaseId,
          tokenId,
          validFrom: now,
          validTo,
          status: 'active',
        });

        return {
          purchaseId,
          status: 'paid',
          entitlementToken: entitlement.tokenId,
        };
      },
    };
  }

  return handlersInstance;
}

// Export for testing
export function setPublicPurchaseHandlers(handlers: PublicPurchaseHandlers): void {
  handlersInstance = handlers;
}

const router = express.Router();

const ProcessPaymentSchema = z.object({
  sourceId: z.string().min(1),
});

/**
 * GET /api/public/purchases/:purchaseId/status
 */
router.get('/purchases/:purchaseId/status', (req, res, next) => {
  void (async () => {
    try {
      const purchaseId = req.params.purchaseId;
      if (!purchaseId) {
        throw new NotFoundError('Purchase not found');
      }

      const handlers = getHandlers();
      const status = await handlers.getStatus(purchaseId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * POST /api/public/purchases/:purchaseId/process
 */
router.post(
  '/purchases/:purchaseId/process',
  validateRequest({ body: ProcessPaymentSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const purchaseId = req.params.purchaseId;
        if (!purchaseId) {
          throw new NotFoundError('Purchase not found');
        }

        const body = req.body as z.infer<typeof ProcessPaymentSchema>;
        const handlers = getHandlers();
        const result = await handlers.processPayment(purchaseId, body.sourceId);
        res.json(result);
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicPurchasesRouter(): Router {
  return router;
}


