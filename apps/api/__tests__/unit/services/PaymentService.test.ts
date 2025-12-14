import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '@/services/PaymentService';
import { NotFoundError } from '@/lib/errors';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '@/repositories/IViewerIdentityRepository';
import type { IPurchaseReader, IPurchaseWriter } from '@/repositories/IPurchaseRepository';
import type { IEntitlementReader, IEntitlementWriter } from '@/repositories/IEntitlementRepository';
import type { Game, Purchase } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockGameReader: IGameReader;
  let mockViewerIdentityReader: IViewerIdentityReader;
  let mockViewerIdentityWriter: IViewerIdentityWriter;
  let mockPurchaseReader: IPurchaseReader;
  let mockPurchaseWriter: IPurchaseWriter;
  let mockEntitlementReader: IEntitlementReader;
  let mockEntitlementWriter: IEntitlementWriter;

  beforeEach(() => {
    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
    };
    mockViewerIdentityReader = {
      getById: vi.fn(),
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
    };
    mockViewerIdentityWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    mockPurchaseReader = {
      getById: vi.fn(),
      getByPaymentProviderId: vi.fn(),
      listByGameId: vi.fn(),
      listByViewerId: vi.fn(),
    };
    mockPurchaseWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    mockEntitlementReader = {
      getById: vi.fn(),
      getByPurchaseId: vi.fn(),
      getByTokenId: vi.fn(),
    };
    mockEntitlementWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new PaymentService(
      mockGameReader,
      mockViewerIdentityReader,
      mockViewerIdentityWriter,
      mockPurchaseReader,
      mockPurchaseWriter,
      mockEntitlementReader,
      mockEntitlementWriter
    );
  });

  describe('createCheckout', () => {
    it('creates checkout successfully with new viewer', async () => {
      const game = {
        id: 'game-1',
        title: 'Test Game',
        priceCents: 1000,
        currency: 'USD',
        state: 'active',
      } as Game;

      const viewer = { id: 'viewer-1', email: 'test@example.com' } as any;
      const purchase = { id: 'purchase-1', gameId: 'game-1', viewerId: 'viewer-1' } as Purchase;

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(null);
      vi.mocked(mockViewerIdentityWriter.create).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseWriter.create).mockResolvedValue(purchase);

      const result = await service.createCheckout('game-1', 'test@example.com');

      expect(result.purchaseId).toBe('purchase-1');
      expect(result.checkoutUrl).toContain('checkout');
      expect(result.checkoutUrl).toContain('purchase-1');
      expect(mockViewerIdentityWriter.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        phoneE164: undefined,
      });
      expect(mockPurchaseWriter.create).toHaveBeenCalled();
    });

    it('throws NotFoundError if game not found', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(null);

      await expect(service.createCheckout('invalid-game', 'test@example.com')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if game not available for purchase', async () => {
      const game = { id: 'game-1', state: 'draft' } as Game;
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);

      await expect(service.createCheckout('game-1', 'test@example.com')).rejects.toThrow(NotFoundError);
    });

    it('updates existing viewer phone if provided', async () => {
      const game = { id: 'game-1', title: 'Test', priceCents: 1000, currency: 'USD', state: 'active' } as Game;
      const viewer = { id: 'viewer-1', email: 'test@example.com', phoneE164: null } as any;
      const purchase = { id: 'purchase-1' } as Purchase;

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(viewer);
      vi.mocked(mockViewerIdentityWriter.update).mockResolvedValue({ ...viewer, phoneE164: '+1234567890' } as any);
      vi.mocked(mockPurchaseWriter.create).mockResolvedValue(purchase);

      await service.createCheckout('game-1', 'test@example.com', '+1234567890');

      expect(mockViewerIdentityWriter.update).toHaveBeenCalledWith('viewer-1', {
        phoneE164: '+1234567890',
      });
    });
  });

  describe('processSquareWebhook', () => {
    it('creates entitlement on successful payment', async () => {
      const purchase = { id: 'purchase-1', gameId: 'game-1' } as Purchase;
      const game = { id: 'game-1', endsAt: new Date('2024-12-31') } as Game;

      vi.mocked(mockPurchaseReader.getByPaymentProviderId).mockResolvedValue(purchase);
      vi.mocked(mockPurchaseWriter.update).mockResolvedValue({ ...purchase, status: 'paid' } as Purchase);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(null);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockEntitlementWriter.create).mockResolvedValue({} as any);

      await service.processSquareWebhook({
        type: 'payment.updated',
        data: {
          object: {
            payment: {
              id: 'square-payment-1',
              status: 'COMPLETED',
              customer_id: 'customer-1',
            },
          },
        },
      });

      expect(mockPurchaseWriter.update).toHaveBeenCalledWith('purchase-1', {
        status: 'paid',
        paidAt: expect.any(Date),
        paymentProviderCustomerId: 'customer-1',
      });
      expect(mockEntitlementWriter.create).toHaveBeenCalled();
    });

    it('updates purchase status to failed on payment failure', async () => {
      const purchase = { id: 'purchase-1' } as Purchase;

      vi.mocked(mockPurchaseReader.getByPaymentProviderId).mockResolvedValue(purchase);
      vi.mocked(mockPurchaseWriter.update).mockResolvedValue({ ...purchase, status: 'failed' } as Purchase);

      await service.processSquareWebhook({
        type: 'payment.updated',
        data: {
          object: {
            payment: {
              id: 'square-payment-1',
              status: 'FAILED',
            },
          },
        },
      });

      expect(mockPurchaseWriter.update).toHaveBeenCalledWith('purchase-1', {
        status: 'failed',
        failedAt: expect.any(Date),
      });
    });

    it('handles refund.created event', async () => {
      const purchase = { id: 'purchase-1', amountCents: 1000 } as Purchase;

      vi.mocked(mockPurchaseReader.getByPaymentProviderId).mockResolvedValue(purchase);
      vi.mocked(mockPurchaseWriter.update).mockResolvedValue({ ...purchase, status: 'refunded' } as Purchase);

      await service.processSquareWebhook({
        type: 'refund.created',
        data: {
          object: {
            refund: {
              paymentId: 'square-payment-1',
              amountMoney: {
                amount: 1000,
              },
            },
          },
        },
      });

      expect(mockPurchaseWriter.update).toHaveBeenCalledWith('purchase-1', {
        status: 'refunded',
        refundedAt: expect.any(Date),
      });
    });
  });
});
