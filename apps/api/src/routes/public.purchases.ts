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
import { buildReceiptStreamUrl } from '../lib/receipt-stream-url';
import { validateRequest } from '../middleware/validation';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { getOwnerPaymentsReadiness } from '../lib/payments-readiness';
import { resolveRelayChargeSettlement } from '../lib/relay-charge-settlement';
import { getRelayConfig } from '../lib/relay';
import { LedgerService } from '../services/LedgerService';
import { ReceiptService } from '../services/ReceiptService';
import { RelayConnectHubService } from '../services/RelayConnectHubService';
import { RelaySavedPaymentService } from '../services/RelaySavedPaymentService';

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

interface PublicPurchaseHandlers {
  get(purchaseId: string): Promise<{ id: string; amountCents: number; currency: string; status: string }>;
  getStatus(purchaseId: string): Promise<{
    purchaseId: string;
    status: string;
    entitlementToken?: string;
    watchUrl?: string;
  }>;
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
    const relayService = new RelayConnectHubService(getRelayConfig());
    const savedPaymentService = new RelaySavedPaymentService(prisma, relayService);

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

      async processPayment(purchaseId: string, sourceId: string) {
        const purchase = await purchaseRepo.getById(purchaseId);
        if (!purchase) {
          throw new NotFoundError('Purchase not found');
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

        const readiness = getOwnerPaymentsReadiness(ownerAccount);
        if (!readiness.ready || !ownerAccount.relayRecipientKey) {
          const detail = readiness.reason ? ` ${readiness.reason}` : '';
          throw new BadRequestError(
            `Owner payments are not ready for checkout.${detail}`.trim(),
          );
        }

        const relayViewer = await prisma.viewerIdentity.findUnique({
          where: { id: purchase.viewerId },
          select: { email: true, phoneE164: true },
        });

        const chargeResult = await relayService.charge(ownerAccount.relayRecipientKey, {
          sourceId,
          amountCents: purchase.amountCents,
          idempotencyKey: purchaseId.substring(0, 45),
          referenceId: purchaseId,
          note: `FieldView purchase ${purchaseId}`,
          buyerEmailAddress: relayViewer?.email ?? undefined,
        });

        const split = resolveRelayChargeSettlement({
          amountCents: purchase.amountCents,
          processorFeeCents: purchase.processorFeeCents,
          appFeeCents: chargeResult.appFeeCents,
        });

        await purchaseRepo.update(purchaseId, {
          paymentProviderPaymentId: chargeResult.paymentId,
          platformFeeCents: split.platformFeeCents,
          processorFeeCents: split.processorFeeCents,
          ownerNetCents: split.ownerNetCents,
        });

        if (chargeResult.status && chargeResult.status !== 'COMPLETED') {
          logger.warn({ status: chargeResult.status }, 'Relay charge not completed; marking failed');
          await purchaseRepo.update(purchaseId, { status: 'failed', failedAt: new Date() });
          return { purchaseId, status: 'failed' };
        }

        if (relayViewer?.email && sourceId) {
          try {
            await savedPaymentService.savePaymentMethodForOwner({
              recipientKey: ownerAccount.relayRecipientKey,
              ownerAccountId: ownerAccount.id,
              viewerId: purchase.viewerId,
              email: relayViewer.email,
              phone: relayViewer.phoneE164 ?? undefined,
              sourceId,
            });
          } catch (err) {
            logger.warn({ err }, 'Failed to save payment method');
          }
        }

        const paidPurchase = await purchaseRepo.update(purchaseId, { status: 'paid', paidAt: new Date() });

        try {
          const existing = await ledgerRepo.findByReference('purchase', purchaseId);
          if (existing.length === 0) {
            await ledgerService.createPurchaseLedgerEntries(paidPurchase, split, undefined);
          }
        } catch (ledgerError) {
          logger.error({ ledgerError }, 'Failed to create ledger entries (relay path)');
        }

        const existingEntitlement = await entitlementRepo.getByPurchaseId(purchaseId);
        if (existingEntitlement) {
          return { purchaseId, status: 'paid', entitlementToken: existingEntitlement.tokenId };
        }

        const now = new Date();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relayGame = (purchase as any).game as { endsAt?: Date | null } | undefined;
        const validTo = relayGame?.endsAt
          ? new Date(relayGame.endsAt)
          : new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tokenId = crypto.randomBytes(32).toString('hex');
        const entitlement = await entitlementRepo.create({
          purchaseId,
          tokenId,
          validFrom: now,
          validTo,
          status: 'active',
        });

        if (relayViewer?.email) {
          const streamUrl = await buildReceiptStreamUrl(purchase, entitlement.tokenId);
          await receiptService.sendPurchaseReceipt({
            to: relayViewer.email,
            purchaseId,
            amountCents: purchase.amountCents,
            currency: purchase.currency || 'USD',
            streamUrl,
          });
        }

        return { purchaseId, status: 'paid', entitlementToken: entitlement.tokenId };
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


