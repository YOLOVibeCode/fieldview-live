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
import { getEmailProvider } from '../lib/email';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { LedgerService } from '../services/LedgerService';
import { ReceiptService } from '../services/ReceiptService';
import { SquareOwnerClientService } from '../services/SquareOwnerClientService';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

interface PublicPurchaseHandlers {
  get(purchaseId: string): Promise<{ id: string; amountCents: number; currency: string; status: string }>;
  getStatus(purchaseId: string): Promise<{ purchaseId: string; status: string; entitlementToken?: string }>;
  processPayment(purchaseId: string, sourceId: string): Promise<{ purchaseId: string; status: string; entitlementToken?: string }>;
}

// Lazy initialization (allows test injection)
let handlersInstance: PublicPurchaseHandlers | null = null;

function getHandlers(): PublicPurchaseHandlers {
  if (!handlersInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const ledgerRepo = new LedgerRepository(prisma);
    const ownerAccountRepo = new OwnerAccountRepository(prisma);
    const ledgerService = new LedgerService(ledgerRepo, ownerAccountRepo);
    const receiptService = new ReceiptService(getEmailProvider(), APP_URL);
    const ownerSquareClientService = new SquareOwnerClientService(ownerAccountRepo);

    handlersInstance = {
      async get(purchaseId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
        }
        // Get viewer email for saved payment methods lookup
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

        // Get owner account for marketplace Model A (charge on owner's Square account)
        if (!purchase.recipientOwnerAccountId) {
          throw new BadRequestError('Purchase missing recipient owner account');
        }

        const ownerAccount = await ownerAccountRepo.findById(purchase.recipientOwnerAccountId);
        if (!ownerAccount) {
          throw new NotFoundError('Owner account not found');
        }

        // Get owner's Square client (marketplace Model A) with refresh support
        const ownerSquareClient = await ownerSquareClientService.getClient(ownerAccount);
        if (!ownerSquareClient) {
          throw new BadRequestError('Owner has not connected Square account. Please connect Square to receive payments.');
        }

        const ownerLocationId = await ownerSquareClientService.ensureLocationId(ownerAccount);
        if (!ownerLocationId) {
          throw new BadRequestError('Owner Square location is not configured. Please reconnect Square.');
        }

        // Calculate marketplace split for application fee
        const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
        const split = calculateMarketplaceSplit(purchase.amountCents, PLATFORM_FEE_PERCENT);

        // Create Square payment on owner's account with application fee (marketplace Model A)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentsApi: any = (ownerSquareClient as any).payments;
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
            // Application fee: 10% platform fee (Square marketplace model)
            applicationFeeMoney: {
              amount: BigInt(split.platformFeeCents),
              currency: purchase.currency || 'USD',
            },
            locationId: ownerLocationId,
            autocomplete: true,
          });
        } catch (error: any) {
          // Log Square API error details for debugging
          const errorMessage = error?.message || String(error);
          const errorBody = error?.body || error?.errors || error?.result?.errors;
          logger.error({
            message: errorMessage,
            body: errorBody,
            sourceId,
            amountCents: purchase.amountCents,
            locationId: ownerLocationId,
            ownerAccountId: ownerAccount.id,
          }, 'Square payment API error');
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

        // Extract actual processing fees from Square payment response
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const processingFeeMoney = payment?.processingFeeMoney;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const actualProcessorFeeCents = processingFeeMoney?.amount 
          ? Number(processingFeeMoney.amount) 
          : undefined; // Use actual fee if available, otherwise use estimated

        if (!paymentId) {
          // Include response structure in error for debugging
          const responseStr = JSON.stringify(result, null, 2).substring(0, 500);
          throw new BadRequestError(
            `Square payment response missing payment ID. Response structure: ${responseStr}`
          );
        }

        // Save payment method to Square (Card on File)
        // IMPORTANT: We do NOT store any payment card data. The sourceId is passed
        // directly to Square, which securely stores all card information.
        // We only store the Square Customer ID reference in our database.
        const viewer = await prisma.viewerIdentity.findUnique({
          where: { id: purchase.viewerId },
          select: { email: true, phoneE164: true },
        });

        // Save payment method to Square (Card on File) in the OWNER seller context.
        // IMPORTANT: We do NOT store any payment card data. The sourceId is passed
        // directly to Square, which stores card data. We only store Square reference IDs.
        if (viewer?.email && sourceId) {
          try {
            const { SquareCustomerService } = await import('../services/SquareCustomerService');
            const squareCustomerService = new SquareCustomerService(prisma);
            const savedCard = await squareCustomerService.savePaymentMethodForOwner({
              ownerAccountId: ownerAccount.id,
              viewerId: purchase.viewerId,
              email: viewer.email,
              phone: viewer.phoneE164 ?? undefined,
              sourceId,
              squareClient: ownerSquareClient,
            });
            // savedCard may be null if card already exists (deduplicated)
            // No card data is stored in our database - Square handles all storage
            if (savedCard) {
              // Card saved successfully to Square (or was duplicate, which is fine)
            }
          } catch (err) {
            // Don't fail payment if saving card fails
            logger.warn({ err }, 'Failed to save payment method');
          }
        }

        // Update purchase with actual processor fee if available
        const updatedProcessorFeeCents = actualProcessorFeeCents ?? purchase.processorFeeCents;
        const updatedOwnerNetCents = purchase.amountCents - split.platformFeeCents - updatedProcessorFeeCents;

        // Persist provider payment id and actual fees
        await purchaseRepo.update(purchaseId, {
          paymentProviderPaymentId: paymentId,
          processorFeeCents: updatedProcessorFeeCents,
          ownerNetCents: updatedOwnerNetCents,
        });

        if (paymentStatus && paymentStatus !== 'COMPLETED') {
          // Payment not completed; mark as failed for now (can be expanded to pending state later)
          // Log the actual status for debugging
          logger.warn({ paymentStatus }, 'Square payment not completed; marking as failed');
          await purchaseRepo.update(purchaseId, { status: 'failed', failedAt: new Date() });
          return { purchaseId, status: 'failed' };
        }

        // Mark purchase as paid
        const updatedPurchase = await purchaseRepo.update(purchaseId, { 
          status: 'paid', 
          paidAt: new Date(),
          paymentProviderCustomerId: payment?.customerId as string | undefined,
        });

        // Create ledger entries (idempotent: check if entries already exist)
        try {
          const existingEntries = await ledgerRepo.findByReference('purchase', purchaseId);
          if (existingEntries.length === 0) {
            // Create ledger entries with actual processor fee
            await ledgerService.createPurchaseLedgerEntries(
              updatedPurchase,
              {
                grossAmountCents: split.grossAmountCents,
                platformFeeCents: split.platformFeeCents,
                processorFeeCents: updatedProcessorFeeCents,
                ownerNetCents: updatedOwnerNetCents,
              },
              actualProcessorFeeCents
            );
          }
        } catch (ledgerError) {
          // Don't fail payment if ledger creation fails (log and continue)
          logger.error({ ledgerError }, 'Failed to create ledger entries');
        }

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

        // Send receipt email (best-effort)
        const viewerEmail = viewer?.email || null;
        if (viewerEmail) {
          await receiptService.sendPurchaseReceipt({
            to: viewerEmail,
            purchaseId,
            amountCents: purchase.amountCents,
            currency: purchase.currency || 'USD',
            streamUrl: `${APP_URL}/stream/${entitlement.tokenId}`,
          });
        }

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
 * GET /api/public/purchases/:purchaseId
 * 
 * Get purchase details.
 */
router.get('/purchases/:purchaseId', (req, res, next) => {
  void (async () => {
    try {
      const purchaseId = req.params.purchaseId;
      if (!purchaseId) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing purchaseId' } });
      }

      const handlers = getHandlers();
      const result = await handlers.get(purchaseId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  })();
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


