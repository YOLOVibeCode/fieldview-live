import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import * as publicPurchasesRoute from '@/routes/public.purchases';
import { NotFoundError } from '@/lib/errors';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Public Purchases Routes', () => {
  let request: SuperTest<typeof app>;
  let mockHandlers: {
    getStatus: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);
    mockHandlers = {
      getStatus: vi.fn(),
      createCheckoutSession: vi.fn(),
    };
    publicPurchasesRoute.setPublicPurchaseHandlers(mockHandlers as never);
  });

  describe('GET /api/public/purchases/:purchaseId/status', () => {
    it('returns purchase status', async () => {
      mockHandlers.getStatus.mockResolvedValue({
        purchaseId: 'purchase-1',
        status: 'paid',
        entitlementToken: 'token-123',
        watchUrl: 'https://fieldview.live/direct/paid-stream',
      });

      const response = await request.get('/api/public/purchases/purchase-1/status').expect(200);
      expect(response.body.purchaseId).toBe('purchase-1');
      expect(response.body.status).toBe('paid');
      expect(response.body.entitlementToken).toBe('token-123');
      expect(response.body.watchUrl).toBe('https://fieldview.live/direct/paid-stream');
      expect(mockHandlers.getStatus).toHaveBeenCalledWith('purchase-1');
    });

    it('returns 404 when purchase not found', async () => {
      mockHandlers.getStatus.mockRejectedValue(new NotFoundError('Purchase not found'));
      await request.get('/api/public/purchases/missing/status').expect(404);
    });
  });

  describe('POST /api/public/purchases/:purchaseId/checkout-session', () => {
    it('creates checkout session and returns checkout URL', async () => {
      mockHandlers.createCheckoutSession.mockResolvedValue({
        checkoutUrl: 'https://store.noctusoft.com/checkout/sess-1',
        sessionId: 'sess-1',
      });

      const response = await request
        .post('/api/public/purchases/purchase-1/checkout-session')
        .send({ returnUrl: 'https://fieldview.live/checkout/purchase-1/payment' })
        .expect(200);

      expect(response.body.checkoutUrl).toContain('checkout');
      expect(mockHandlers.createCheckoutSession).toHaveBeenCalledWith('purchase-1', {
        returnUrl: 'https://fieldview.live/checkout/purchase-1/payment',
      });
    });

    it('returns 404 when purchase not found', async () => {
      mockHandlers.createCheckoutSession.mockRejectedValue(new NotFoundError('Purchase not found'));
      await request
        .post('/api/public/purchases/missing/checkout-session')
        .send({})
        .expect(404);
    });
  });
});
