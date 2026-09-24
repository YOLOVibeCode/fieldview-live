/**
 * Relay Connect Hub inbound webhook (Stripe events forwarded by Noctusoft relay).
 */

import express, { type Router } from 'express';

import { checkIdempotencyKey, storeIdempotencyKey } from '../lib/idempotency';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { verifyRelaySignature } from '../lib/relay';
import { extractPurchaseIdFromStripeObject } from '../lib/relay-stripe-webhook';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { LedgerRepository } from '../repositories/implementations/LedgerRepository';
import { OwnerAccountRepository } from '../repositories/implementations/OwnerAccountRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';
import { PurchaseFulfillmentService } from '../services/PurchaseFulfillmentService';

const router = express.Router();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4301';

function callbackUrl(): string {
  return (
    process.env.FIELDVIEW_WEBHOOK_CALLBACK_URL ||
    `${API_BASE_URL.replace(/\/$/, '')}/api/webhooks/relay`
  );
}

export interface RelayWebhookEvent {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}

export interface IRelayWebhookHandler {
  handle(event: RelayWebhookEvent, ctx: { productKey?: string; recipientKey?: string }): Promise<void>;
}

export class RelayWebhookHandler implements IRelayWebhookHandler {
  constructor(
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
    private fulfillment: PurchaseFulfillmentService,
    private ownerRepo: OwnerAccountRepository,
  ) {}

  private async isDuplicateEvent(eventId: string): Promise<boolean> {
    const key = `relay-stripe-event:${eventId}`;
    try {
      const cached = await checkIdempotencyKey(key);
      if (cached.exists) {
        return true;
      }
      await storeIdempotencyKey(key, '1');
    } catch (err) {
      logger.warn({ err, eventId }, 'Relay webhook idempotency store unavailable');
    }
    return false;
  }

  async handle(event: RelayWebhookEvent, ctx: { productKey?: string; recipientKey?: string }): Promise<void> {
    if (event.id) {
      const duplicate = await this.isDuplicateEvent(event.id);
      if (duplicate) {
        return;
      }
    }

    const object = event.data?.object;
    if (!object) {
      return;
    }

    if (event.type === 'account.updated') {
      const chargesEnabled = object.charges_enabled === true;
      if (chargesEnabled && ctx.recipientKey) {
        const owner = await prisma.ownerAccount.findFirst({
          where: { relayRecipientKey: ctx.recipientKey },
        });
        if (owner && !owner.paymentsConnectedAt) {
          await this.ownerRepo.update(owner.id, { paymentsConnectedAt: new Date() });
        }
      }
      return;
    }

    if (event.type === 'charge.refunded') {
      const paymentIntent =
        typeof object.payment_intent === 'string'
          ? object.payment_intent
          : typeof object.id === 'string'
            ? object.id
            : null;
      if (!paymentIntent) {
        return;
      }
      const purchase = await this.purchaseReader.getByPaymentProviderId(paymentIntent);
      if (purchase) {
        await this.purchaseWriter.update(purchase.id, { status: 'refunded', refundedAt: new Date() });
      }
      return;
    }

    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const purchaseId = extractPurchaseIdFromStripeObject(object);
      let purchase = purchaseId ? await this.purchaseReader.getById(purchaseId) : null;

      const paymentIntentId =
        typeof object.payment_intent === 'string'
          ? object.payment_intent
          : typeof object.id === 'string' && event.type === 'payment_intent.succeeded'
            ? object.id
            : null;

      if (!purchase && paymentIntentId) {
        purchase = await this.purchaseReader.getByPaymentProviderId(paymentIntentId);
      }

      if (!purchase) {
        logger.warn({ type: event.type, purchaseId, paymentIntentId }, 'Relay webhook: purchase not found');
        return;
      }

      const providerPaymentId = paymentIntentId ?? purchase.paymentProviderPaymentId ?? purchase.id;
      const appFee =
        typeof object.application_fee_amount === 'number' ? object.application_fee_amount : null;

      await this.fulfillment.fulfillPaidPurchase({
        purchaseId: purchase.id,
        paymentProviderPaymentId: providerPaymentId,
        appFeeCents: appFee,
      });
    }
  }
}

let handlerInstance: IRelayWebhookHandler | null = null;

function getHandler(): IRelayWebhookHandler {
  if (!handlerInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const ledgerRepo = new LedgerRepository(prisma);
    const ownerRepo = new OwnerAccountRepository(prisma);
    const gameRepo = new GameRepository(prisma);
    const fulfillment = new PurchaseFulfillmentService(
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      gameRepo,
      ledgerRepo,
      ownerRepo,
    );
    handlerInstance = new RelayWebhookHandler(purchaseRepo, purchaseRepo, fulfillment, ownerRepo);
  }
  return handlerInstance;
}

export function setRelayWebhookHandler(h: IRelayWebhookHandler): void {
  handlerInstance = h;
}

router.post('/relay', (req, res, next) => {
  void (async () => {
    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);
      const signature = req.headers['x-connect-signature'] as string | undefined;

      if (!verifyRelaySignature(signature, bodyString, callbackUrl())) {
        return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid relay signature' } });
      }

      const event = JSON.parse(bodyString) as RelayWebhookEvent;
      const ctx = {
        productKey: req.headers['x-connect-product'] as string | undefined,
        recipientKey: req.headers['x-connect-recipient-key'] as string | undefined,
      };
      logger.info({ type: event.type, productKey: ctx.productKey, recipientKey: ctx.recipientKey }, 'Relay webhook received');
      await getHandler().handle(event, ctx);

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  })();
});

export function createRelayWebhookRouter(): Router {
  return router;
}
