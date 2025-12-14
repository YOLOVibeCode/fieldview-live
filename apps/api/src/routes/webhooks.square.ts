/**
 * Square Webhook Routes
 * 
 * Handles Square payment webhooks.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';

import { prisma } from '../lib/prisma';
import { validateSquareWebhook } from '../lib/square';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import type { SquareWebhookEvent } from '../services/IPaymentService';
import { PaymentService } from '../services/PaymentService';

const router = express.Router();

// Lazy initialization
let paymentServiceInstance: PaymentService | null = null;

function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    paymentServiceInstance = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo
    );
  }
  return paymentServiceInstance;
}

// Export for testing
export function setPaymentService(service: PaymentService): void {
  paymentServiceInstance = service;
}

/**
 * POST /api/webhooks/square
 * 
 * Handle Square payment webhooks.
 */
router.post(
  '/square',
  express.json(),
  (req, res, next) => {
    void (async () => {
      try {
        // Verify webhook signature (TODO: implement proper validation)
        const signature = req.headers['x-square-signature'] as string | undefined;
        const webhookUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const bodyString = JSON.stringify(req.body);

        const isValid = validateSquareWebhook(signature, bodyString, webhookUrl);
        if (!isValid) {
          return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } });
        }

        const event = req.body as { type?: string; data?: unknown };
        if (!event.type) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing event type' } });
        }

        const paymentService = getPaymentService();
        await paymentService.processSquareWebhook(event as SquareWebhookEvent);

        res.json({ received: true });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createSquareWebhookRouter(): Router {
  return router;
}
