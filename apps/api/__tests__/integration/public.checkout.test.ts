import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { PaymentService } from '@/services/PaymentService';
import { CouponService } from '@/services/CouponService';
import * as publicCheckoutRoute from '@/routes/public.checkout';
import { NotFoundError } from '@/lib/errors';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Disable checkout rate limiting for this test suite to avoid cross-test interference
vi.mock('@/middleware/rateLimit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/middleware/rateLimit')>();
  return {
    ...actual,
    checkoutRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  };
});

describe('Public Checkout Routes', () => {
  let request: SuperTest<typeof app>;
  let mockPaymentService: {
    createCheckout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockPaymentService = {
      createCheckout: vi.fn(),
    };

    // Set the mocked service
    publicCheckoutRoute.setPaymentService(mockPaymentService as any);
  });

  describe('POST /api/public/games/:gameId/checkout', () => {
    it('creates checkout successfully', async () => {
      mockPaymentService.createCheckout.mockResolvedValue({
        purchaseId: 'purchase-1',
        checkoutUrl: 'https://fieldview.live/checkout/purchase-1',
      });

      const response = await request
        .post('/api/public/games/game-1/checkout')
        .send({
          viewerEmail: 'test@example.com',
        })
        .expect(200);

      expect(response.body.purchaseId).toBe('purchase-1');
      expect(response.body.checkoutUrl).toContain('checkout');
      expect(mockPaymentService.createCheckout).toHaveBeenCalledWith(
        'game-1',
        'test@example.com',
        undefined,
        undefined,
        undefined,
        expect.any(CouponService)
      );
    });

    it('requires viewerEmail', async () => {
      await request
        .post('/api/public/games/game-1/checkout')
        .send({
          // Missing viewerEmail
        })
        .expect(400);
    });

    it('validates email format', async () => {
      await request
        .post('/api/public/games/game-1/checkout')
        .send({
          viewerEmail: 'invalid-email',
        })
        .expect(400);
    });

    it('accepts optional viewerPhone', async () => {
      mockPaymentService.createCheckout.mockResolvedValue({
        purchaseId: 'purchase-1',
        checkoutUrl: 'https://fieldview.live/checkout/purchase-1',
      });

      await request
        .post('/api/public/games/game-1/checkout')
        .send({
          viewerEmail: 'test@example.com',
          viewerPhone: '+1234567890',
        })
        .expect(200);

      expect(mockPaymentService.createCheckout).toHaveBeenCalledWith(
        'game-1',
        'test@example.com',
        '+1234567890',
        undefined,
        undefined,
        expect.any(CouponService)
      );
    });

    it('handles game not found', async () => {
      mockPaymentService.createCheckout.mockRejectedValue(new NotFoundError('Game not found'));

      await request
        .post('/api/public/games/invalid-game/checkout')
        .send({
          viewerEmail: 'test@example.com',
        })
        .expect(404);
    });

    it('validates phone number format', async () => {
      await request
        .post('/api/public/games/game-1/checkout')
        .send({
          viewerEmail: 'test@example.com',
          viewerPhone: 'invalid-phone',
        })
        .expect(400);
    });
  });
});
