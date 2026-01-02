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
import { validateRequest } from '../middleware/validation';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';

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
        // Square SDK v43+ uses client.payments.create() instead of paymentsApi.createPayment()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentsApi: any = (squareClient as any).payments;
        if (!paymentsApi?.create) {
          throw new Error('Square payments API not available');
        }

        let result: any;
        try {
          // Square requires idempotency_key <= 45 chars. Use purchaseId (UUID) which is unique.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await paymentsApi.create({
            idempotencyKey: purchaseId.substring(0, 45), // UUID is 36 chars, well under limit
            sourceId,
            amountMoney: {
              amount: BigInt(purchase.amountCents),
              currency: purchase.currency || 'USD',
            },
            locationId: squareLocationId,
            autocomplete: true,
          });
        } catch (error: any) {
          // Log Square API error details for debugging
          const errorMessage = error?.message || String(error);
          const errorBody = error?.body || error?.errors || error?.result?.errors;
          console.error('Square payment API error:', {
            message: errorMessage,
            body: errorBody,
            sourceId,
            amountCents: purchase.amountCents,
            locationId: squareLocationId,
          });
          throw new BadRequestError(
            `Square payment failed: ${errorMessage}${errorBody ? ` - ${JSON.stringify(errorBody)}` : ''}`
          );
        }

        // Square SDK v43+ response structure: Try multiple possible paths
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const payment: any =
          result?.result?.payment || // Standard structure
          result?.payment || // Alternative structure
          result?.result; // If payment is directly in result

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const paymentId = payment?.id as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const paymentStatus = payment?.status as string | undefined;

        if (!paymentId) {
          // Include response structure in error for debugging
          const responseStr = JSON.stringify(result, null, 2).substring(0, 500);
          throw new BadRequestError(
            `Square payment response missing payment ID. Response structure: ${responseStr}`
          );
        }

        // Persist provider payment id
        await purchaseRepo.update(purchaseId, {
          paymentProviderPaymentId: paymentId,
        });

        if (paymentStatus && paymentStatus !== 'COMPLETED') {
          // Payment not completed; mark as failed for now (can be expanded to pending state later)
          // Log the actual status for debugging
          console.warn(`Square payment status is '${paymentStatus}', expected 'COMPLETED'. Marking as failed.`);
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


