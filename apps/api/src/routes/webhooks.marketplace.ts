/**
 * Store marketplace inbound webhook (event v1).
 */

import express, { type Router } from 'express';

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { verifyMarketplaceWebhookSignatures } from '../lib/marketplace';
import { getEmailProvider } from '../lib/email';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { LedgerService } from '../services/LedgerService';
import { PurchaseFulfillmentService } from '../services/PurchaseFulfillmentService';
import { ReceiptService } from '../services/ReceiptService';
import { calculateMarketplaceSplit } from '../utils/feeCalculator';

const router = express.Router();
const APP_URL = process.env.APP_URL || 'https://fieldview.live';
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');

export interface MarketplaceWebhookEvent {
  type?: string;
  data?: {
    reference_id?: string;
    payment_id?: string;
    paymentId?: string;
    amount_cents?: number;
    app_fee_cents?: number;
    processor_fee_cents?: number;
    object?: Record<string, unknown>;
  };
}

let fulfillmentInstance: PurchaseFulfillmentService | null = null;

function getFulfillment(): PurchaseFulfillmentService {
  if (!fulfillmentInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const ledgerRepo = new LedgerRepository(prisma);
    const ownerRepo = new OwnerAccountRepository(prisma);
    const ledgerService = new LedgerService(ledgerRepo, ownerRepo);
    const receiptService = new ReceiptService(getEmailProvider(), APP_URL);
    fulfillmentInstance = new PurchaseFulfillmentService(
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      ledgerService,
      ledgerRepo,
      receiptService,
    );
  }
  return fulfillmentInstance;
}

export function setPurchaseFulfillmentService(service: PurchaseFulfillmentService): void {
  fulfillmentInstance = service;
}

function paymentIdFromEvent(event: MarketplaceWebhookEvent): string | undefined {
  const data = event.data;
  const fromObject = data?.object as { payment_id?: string; id?: string } | undefined;
  return (
    data?.payment_id ||
    data?.paymentId ||
    (typeof fromObject?.payment_id === 'string' ? fromObject.payment_id : undefined) ||
    (typeof fromObject?.id === 'string' ? fromObject.id : undefined)
  );
}

function referenceIdFromEvent(event: MarketplaceWebhookEvent): string | undefined {
  const data = event.data;
  const fromObject = data?.object as { reference_id?: string } | undefined;
  return data?.reference_id || fromObject?.reference_id;
}

router.post('/marketplace', (req, res, next) => {
  void (async () => {
    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);
      const connectSignature = req.headers['x-connect-signature'] as string | undefined;
      const noctusoftSignature = req.headers['x-noctusoft-signature'] as string | undefined;

      if (!verifyMarketplaceWebhookSignatures(bodyString, connectSignature, noctusoftSignature)) {
        return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid marketplace signature' } });
      }

      const event = JSON.parse(bodyString) as MarketplaceWebhookEvent;
      logger.info({ type: event.type }, 'Marketplace webhook received');

      const purchaseRepo = new PurchaseRepository(prisma);
      const fulfillment = getFulfillment();

      if (event.type === 'marketplace.checkout.completed' || event.type === 'marketplace.payment.completed') {
        const referenceId = referenceIdFromEvent(event);
        const paymentId = paymentIdFromEvent(event);
        if (!referenceId || !paymentId) {
          return res.status(200).json({ received: true });
        }

        const purchase = await purchaseRepo.getById(referenceId);
        if (!purchase || purchase.status !== 'created') {
          return res.status(200).json({ received: true });
        }

        const splitEstimate = calculateMarketplaceSplit(purchase.amountCents, PLATFORM_FEE_PERCENT);
        const appFee = event.data?.app_fee_cents;
        const processorFee = event.data?.processor_fee_cents;
        const platformFeeCents = typeof appFee === 'number' ? appFee : splitEstimate.platformFeeCents;
        const processorFeeCents = typeof processorFee === 'number' ? processorFee : splitEstimate.processorFeeCents;
        const ownerNetCents = purchase.amountCents - platformFeeCents - processorFeeCents;

        const viewer = await prisma.viewerIdentity.findUnique({
          where: { id: purchase.viewerId },
          select: { email: true },
        });

        await fulfillment.fulfillPaidPurchase({
          purchase,
          paymentId,
          split: { platformFeeCents, processorFeeCents, ownerNetCents },
          viewerEmail: viewer?.email,
        });
      }

      if (event.type === 'marketplace.checkout.failed' || event.type === 'marketplace.payment.failed') {
        const referenceId = referenceIdFromEvent(event);
        if (referenceId) {
          const purchase = await purchaseRepo.getById(referenceId);
          if (purchase && purchase.status === 'created') {
            await purchaseRepo.update(referenceId, { status: 'failed', failedAt: new Date() });
          }
        }
      }

      if (event.type === 'marketplace.refund.completed' || event.type === 'marketplace.refund.updated') {
        const paymentId = paymentIdFromEvent(event);
        if (paymentId) {
          const purchase = await purchaseRepo.getByPaymentProviderId(paymentId);
          if (purchase) {
            await purchaseRepo.update(purchase.id, { status: 'refunded', refundedAt: new Date() });
          }
        }
      }

      if (event.type === 'seller.onboarded' || event.type === 'seller.connected') {
        const sellerKey = req.headers['x-connect-seller-key'] as string | undefined;
        if (sellerKey) {
          const ownerRepo = new OwnerAccountRepository(prisma);
          const owner = await ownerRepo.findById(sellerKey);
          if (owner) {
            await ownerRepo.update(owner.id, {
              marketplaceSellerKey: sellerKey,
              paymentsConnectedAt: owner.paymentsConnectedAt ?? new Date(),
            });
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  })();
});

export function createMarketplaceWebhookRouter(): Router {
  return router;
}
