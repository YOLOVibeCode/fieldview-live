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
import { WatchLinkRepository } from '../repositories/implementations/WatchLinkRepository';
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
    const watchLinkRepo = new WatchLinkRepository(prisma);
    paymentServiceInstance = new PaymentService(
      gameRepo,
      viewerIdentityRepo,
      viewerIdentityRepo,
      purchaseRepo,
      purchaseRepo,
      entitlementRepo,
      entitlementRepo,
      watchLinkRepo
    );
  }
  return paymentServiceInstance;
}

// Export for testing
export function setPaymentService(service: PaymentService): void {
  paymentServiceInstance = service;
}

/**
 * GET /api/webhooks/square
 * 
 * Handle Square's validation check (Square may send GET/HEAD to verify endpoint).
 * Returns simple 200 OK for Square's URL validation.
 */
router.get('/square', (_req, res) => {
  res.status(200).json({ received: true });
});

/**
 * HEAD /api/webhooks/square
 * 
 * Handle Square's HEAD request for validation.
 */
router.head('/square', (_req, res) => {
  res.status(200).end();
});

/**
 * POST /api/webhooks/square
 * 
 * Handle Square payment webhooks.
 */
router.post(
  '/square',
  (req, res, next) => {
    void (async () => {
      try {
        // Verify webhook signature (Square requires raw request body)
        const signature =
          (req.headers['x-square-hmacsha256-signature'] as string | undefined) ||
          (req.headers['x-square-signature'] as string | undefined);

        const apiBaseUrl = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
        const webhookUrl = apiBaseUrl
          ? `${apiBaseUrl}${req.originalUrl}`
          : `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
        const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

        // Handle Square's validation request (empty body or test payload)
        // Square may send a validation request without signature during setup
        const isEmptyOrTest = !bodyString || bodyString === '{}' || bodyString === 'null';
        if (isEmptyOrTest && !signature) {
          // Return 200 OK for Square's validation check
          return res.status(200).json({ received: true, message: 'Webhook endpoint is ready' });
        }

        // Allow test mode for local testing (skip signature validation)
        const isTestMode = process.env.NODE_ENV !== 'production' && req.headers['x-test-mode'] === 'true';
        
        if (!isTestMode) {
          const isValid = validateSquareWebhook(signature, bodyString, webhookUrl);
          if (!isValid) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } });
          }
        } else {
          console.log('[Webhook] ⚠️  Test mode: Skipping signature validation');
        }

        const event = JSON.parse(bodyString) as { type?: string; data?: unknown };
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
