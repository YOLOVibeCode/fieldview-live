/**
 * Square Webhook Integration Tests
 *
 * Verifies webhook signature validation and event processing.
 * Critical for payment status updates and security.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';
import { type SuperTest, agent } from 'supertest';

import app from '@/server';
import * as webhooksSquareRoute from '@/routes/webhooks.square';
import { validateSquareWebhook } from '@/lib/square';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock Square webhook validation
vi.mock('@/lib/square', () => ({
  squareClient: {},
  squareLocationId: 'test-location-id',
  validateSquareWebhook: vi.fn(),
}));

// Store original env
const originalWebhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

describe('Square Webhook Routes', () => {
  let request: SuperTest<typeof app>;
  let mockPaymentService: {
    processSquareWebhook: ReturnType<typeof vi.fn>;
  };

  const WEBHOOK_SIGNATURE_KEY = 'test-webhook-signature-key-12345';

  beforeEach(() => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = WEBHOOK_SIGNATURE_KEY;
    process.env.API_BASE_URL = 'https://api.fieldview.live';

    request = agent(app);
    mockPaymentService = {
      processSquareWebhook: vi.fn().mockResolvedValue(undefined),
    };
    webhooksSquareRoute.setPaymentService(mockPaymentService as any);

    // Default: valid signature
    vi.mocked(validateSquareWebhook).mockReturnValue(true);
  });

  afterEach(() => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = originalWebhookKey;
  });

  /**
   * Generate a valid Square webhook signature.
   * Square spec: base64(HMAC-SHA256(signatureKey, webhookUrl + requestBody))
   */
  function generateSignature(body: string, webhookUrl: string): string {
    return crypto
      .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
      .update(`${webhookUrl}${body}`)
      .digest('base64');
  }

  describe('GET /api/webhooks/square', () => {
    it('returns 200 OK for Square validation check', async () => {
      const response = await request.get('/api/webhooks/square').expect(200);

      expect(response.body.received).toBe(true);
    });
  });

  describe('HEAD /api/webhooks/square', () => {
    it('returns 200 OK for Square HEAD validation', async () => {
      await request.head('/api/webhooks/square').expect(200);
    });
  });

  describe('POST /api/webhooks/square - Signature Validation', () => {
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';

    it('returns 401 for missing signature', async () => {
      // Mock validation to return false (missing/invalid signature)
      vi.mocked(validateSquareWebhook).mockReturnValue(false);

      const body = JSON.stringify({ type: 'payment.created', data: {} });

      const response = await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid signature');
    });

    it('returns 401 for invalid signature', async () => {
      // Mock validation to return false
      vi.mocked(validateSquareWebhook).mockReturnValue(false);

      const body = JSON.stringify({ type: 'payment.created', data: {} });
      const invalidSignature = 'invalid-signature-base64==';

      const response = await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', invalidSignature)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts valid signature and processes webhook', async () => {
      const event = { type: 'payment.created', data: { object: { payment: { id: 'pay-123' } } } };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      const response = await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(mockPaymentService.processSquareWebhook).toHaveBeenCalledWith(event);
    });

    it('accepts x-square-signature header (alternate header name)', async () => {
      const event = { type: 'payment.updated', data: {} };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      const response = await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-signature', signature)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('returns 200 for empty body without signature (validation request)', async () => {
      const response = await request
        .post('/api/webhooks/square')
        .send({})
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.received).toBe(true);
      expect(response.body.message).toBe('Webhook endpoint is ready');
    });
  });

  describe('POST /api/webhooks/square - Event Processing', () => {
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';

    it('returns 400 for missing event type', async () => {
      const body = JSON.stringify({ data: {} }); // Missing 'type'
      const signature = generateSignature(body, webhookUrl);

      const response = await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(400);

      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toBe('Missing event type');
    });

    it('processes payment.created event', async () => {
      const event = {
        type: 'payment.created',
        data: {
          object: {
            payment: {
              id: 'sq-payment-123',
              status: 'COMPLETED',
              amount_money: { amount: 1000, currency: 'USD' },
            },
          },
        },
      };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      expect(mockPaymentService.processSquareWebhook).toHaveBeenCalledWith(event);
    });

    it('processes payment.updated event', async () => {
      const event = {
        type: 'payment.updated',
        data: {
          object: {
            payment: {
              id: 'sq-payment-123',
              status: 'COMPLETED',
            },
          },
        },
      };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      expect(mockPaymentService.processSquareWebhook).toHaveBeenCalledWith(event);
    });

    it('processes refund.created event', async () => {
      const event = {
        type: 'refund.created',
        data: {
          object: {
            refund: {
              id: 'sq-refund-123',
              payment_id: 'sq-payment-123',
              amount_money: { amount: 1000, currency: 'USD' },
            },
          },
        },
      };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      expect(mockPaymentService.processSquareWebhook).toHaveBeenCalledWith(event);
    });
  });

  describe('Webhook idempotency', () => {
    const webhookUrl = 'https://api.fieldview.live/api/webhooks/square';

    it('can process the same event multiple times (idempotent)', async () => {
      const event = {
        type: 'payment.created',
        data: { object: { payment: { id: 'sq-payment-123' } } },
      };
      const body = JSON.stringify(event);
      const signature = generateSignature(body, webhookUrl);

      // First call
      await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      // Second call (same event)
      await request
        .post('/api/webhooks/square')
        .send(body)
        .set('Content-Type', 'application/json')
        .set('x-square-hmacsha256-signature', signature)
        .expect(200);

      // Both should succeed (PaymentService handles idempotency)
      expect(mockPaymentService.processSquareWebhook).toHaveBeenCalledTimes(2);
    });
  });
});

// Note: validateSquareWebhook utility tests are in __tests__/unit/lib/square.test.ts
// to avoid conflicts with the mocked version used in integration tests
