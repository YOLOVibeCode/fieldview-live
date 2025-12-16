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
    processPayment: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);
    mockHandlers = {
      getStatus: vi.fn(),
      processPayment: vi.fn(),
    };
    publicPurchasesRoute.setPublicPurchaseHandlers(mockHandlers as any);
  });

  describe('GET /api/public/purchases/:purchaseId/status', () => {
    it('returns purchase status', async () => {
      mockHandlers.getStatus.mockResolvedValue({
        purchaseId: 'purchase-1',
        status: 'paid',
        entitlementToken: 'token-123',
      });

      const response = await request.get('/api/public/purchases/purchase-1/status').expect(200);
      expect(response.body.purchaseId).toBe('purchase-1');
      expect(response.body.status).toBe('paid');
      expect(response.body.entitlementToken).toBe('token-123');
      expect(mockHandlers.getStatus).toHaveBeenCalledWith('purchase-1');
    });

    it('returns 404 when purchase not found', async () => {
      mockHandlers.getStatus.mockRejectedValue(new NotFoundError('Purchase not found'));
      await request.get('/api/public/purchases/missing/status').expect(404);
    });
  });

  describe('POST /api/public/purchases/:purchaseId/process', () => {
    it('requires sourceId', async () => {
      await request.post('/api/public/purchases/purchase-1/process').send({}).expect(400);
    });

    it('processes payment and returns entitlement token', async () => {
      mockHandlers.processPayment.mockResolvedValue({
        purchaseId: 'purchase-1',
        status: 'paid',
        entitlementToken: 'token-123',
      });

      const response = await request
        .post('/api/public/purchases/purchase-1/process')
        .send({ sourceId: 'cnon:card-nonce-ok' })
        .expect(200);

      expect(response.body.status).toBe('paid');
      expect(response.body.entitlementToken).toBe('token-123');
      expect(mockHandlers.processPayment).toHaveBeenCalledWith('purchase-1', 'cnon:card-nonce-ok');
    });

    it('returns 404 when purchase not found', async () => {
      mockHandlers.processPayment.mockRejectedValue(new NotFoundError('Purchase not found'));
      await request
        .post('/api/public/purchases/missing/process')
        .send({ sourceId: 'cnon:card-nonce-ok' })
        .expect(404);
    });
  });
});


