/**
 * Relay Connect Hub inbound webhook.
 *
 * The relay verifies Square's platform webhook, then re-signs each event with this
 * product's secret and forwards it here (POST /api/webhooks/relay) with headers
 * x-connect-signature / x-connect-product / x-connect-recipient-key. We verify the
 * HMAC (see lib/relay.verifyRelaySignature) before acting on any event.
 *
 * Raw body for HMAC comes from the app-wide express.json({ verify }) in server.ts.
 * See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import express, { type Router } from 'express';

import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { verifyRelaySignature } from '../lib/relay';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import type { IPurchaseReader, IPurchaseWriter } from '../repositories/IPurchaseRepository';

const router = express.Router();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4301';

function callbackUrl(): string {
  return (
    process.env.FIELDVIEW_WEBHOOK_CALLBACK_URL ||
    `${API_BASE_URL.replace(/\/$/, '')}/api/webhooks/relay`
  );
}

export interface RelayWebhookEvent {
  type?: string;
  data?: { object?: Record<string, unknown> };
}

export interface IRelayWebhookHandler {
  handle(event: RelayWebhookEvent, ctx: { productKey?: string; recipientKey?: string }): Promise<void>;
}

/**
 * Minimal handler: on a completed refund, mark the purchase refunded. Dispute and
 * payment updates are acknowledged/logged — extend once the webhook is live and the
 * exact forwarded event shapes are confirmed against the relay canary.
 */
export class RelayWebhookHandler implements IRelayWebhookHandler {
  constructor(
    private purchaseReader: IPurchaseReader,
    private purchaseWriter: IPurchaseWriter,
  ) {}

  async handle(event: RelayWebhookEvent): Promise<void> {
    if (event.type === 'refund.updated') {
      const refund = event.data?.object?.refund as { payment_id?: string; status?: string } | undefined;
      if (refund?.payment_id && refund.status === 'COMPLETED') {
        const purchase = await this.purchaseReader.getByPaymentProviderId(refund.payment_id);
        if (purchase) {
          await this.purchaseWriter.update(purchase.id, { status: 'refunded', refundedAt: new Date() });
        }
      }
    }
    // 'dispute.created' / 'payment.updated' are acknowledged; handle when live.
  }
}

let handlerInstance: IRelayWebhookHandler | null = null;

function getHandler(): IRelayWebhookHandler {
  if (!handlerInstance) {
    const purchaseRepo = new PurchaseRepository(prisma);
    handlerInstance = new RelayWebhookHandler(purchaseRepo, purchaseRepo);
  }
  return handlerInstance;
}

export function setRelayWebhookHandler(h: IRelayWebhookHandler): void {
  handlerInstance = h;
}

/**
 * POST /api/webhooks/relay
 */
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
