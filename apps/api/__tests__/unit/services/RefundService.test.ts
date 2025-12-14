import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundService } from '@/services/RefundService';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import type { IPurchaseReader, IPurchaseWriter } from '@/repositories/IPurchaseRepository';
import type { IPlaybackSessionReader } from '@/repositories/IPlaybackSessionRepository';
import type { IRefundReader as IRefundRepoReader, IRefundWriter as IRefundRepoWriter } from '@/repositories/IRefundRepository';
import type { IEntitlementReader } from '@/services/IEntitlementService';
import type { ISmsWriter } from '@/services/ISmsService';
import type { Purchase, Entitlement, PlaybackSession, Refund } from '@prisma/client';
import { squareClient } from '@/lib/square';

// Mock Square client
vi.mock('@/lib/square', () => ({
  squareClient: {
    refundsApi: {
      refundPayment: vi.fn(),
    },
  },
}));

describe('RefundService', () => {
  let service: RefundService;
  let mockPurchaseReader: IPurchaseReader;
  let mockPurchaseWriter: IPurchaseWriter;
  let mockPlaybackSessionReader: IPlaybackSessionReader;
  let mockRefundReader: IRefundRepoReader;
  let mockRefundWriter: IRefundRepoWriter;
  let mockEntitlementReader: IEntitlementReader;
  let mockSmsWriter: ISmsWriter;

  beforeEach(() => {
    vi.clearAllMocks();

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
    mockPlaybackSessionReader = {
      getById: vi.fn(),
      listByEntitlementId: vi.fn(),
    };
    mockRefundReader = {
      getById: vi.fn(),
      getByPurchaseId: vi.fn(),
    };
    mockRefundWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    mockEntitlementReader = {
      validateToken: vi.fn(),
      getByPurchaseId: vi.fn(),
    };
    mockSmsWriter = {
      sendPaymentLink: vi.fn(),
      sendNotification: vi.fn(),
      handleStop: vi.fn(),
      handleHelp: vi.fn(),
      logSmsMessage: vi.fn(),
    };
    service = new RefundService(
      mockPurchaseReader,
      mockPurchaseWriter,
      mockPlaybackSessionReader,
      mockRefundReader,
      mockRefundWriter,
      mockEntitlementReader,
      mockSmsWriter
    );
  });

  describe('evaluateRefundEligibility', () => {
    it('returns eligible refund evaluation for high buffer ratio', async () => {
      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
        amountCents: 1000,
        currency: 'USD',
        game: {
          id: 'game-1',
          startsAt: new Date('2024-01-01T12:00:00Z'),
          endsAt: new Date('2024-01-01T13:30:00Z'),
        },
      } as any;

      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
      } as Entitlement;

      const sessions = [
        {
          id: 'session-1',
          totalWatchMs: 60000,
          totalBufferMs: 15000, // 25% buffer ratio
          bufferEvents: 5,
          fatalErrors: 0,
        },
      ] as PlaybackSession[];

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase as any);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([]);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(entitlement);
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId).mockResolvedValue(sessions);

      const result = await service.evaluateRefundEligibility('purchase-1');

      expect(result.eligible).toBe(true);
      expect(result.amountCents).toBe(1000);
      expect(result.bufferRatio).toBe(0.25);
    });

    it('returns not eligible when already refunded', async () => {
      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
        amountCents: 1000,
      } as any;

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([
        { id: 'refund-1' } as Refund,
      ]);

      const result = await service.evaluateRefundEligibility('purchase-1');

      expect(result.eligible).toBe(false);
    });

    it('throws NotFoundError for non-existent purchase', async () => {
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(null);

      await expect(service.evaluateRefundEligibility('invalid-purchase')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('issueRefund', () => {
    it('issues refund successfully', async () => {
      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
        amountCents: 1000,
        currency: 'USD',
        paymentProviderPaymentId: 'square-payment-123',
        game: { title: 'Test Game' },
        viewer: { phoneE164: '+1234567890', smsOptOut: false },
      } as any;

      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
      } as Entitlement;

      const sessions = [
        {
          id: 'session-1',
          totalWatchMs: 60000,
          totalBufferMs: 15000,
          bufferEvents: 5,
          fatalErrors: 0,
        },
      ] as PlaybackSession[];

      const refund = {
        id: 'refund-1',
        purchaseId: 'purchase-1',
        amountCents: 1000,
        reasonCode: 'full_refund_buffer_ratio_high',
      } as Refund;

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([]);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(entitlement);
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId).mockResolvedValue(sessions);
      vi.mocked(mockRefundWriter.create).mockResolvedValue(refund);
      vi.mocked(mockPurchaseWriter.update).mockResolvedValue(purchase);
      vi.mocked(mockRefundReader.getById).mockResolvedValue({
        ...refund,
        purchase,
      } as any);
      vi.mocked(squareClient.refundsApi.refundPayment).mockResolvedValue({} as any);
      vi.mocked(mockRefundWriter.update).mockResolvedValue(refund);

      const telemetry = {
        watchMs: 60000,
        bufferMs: 15000,
        bufferEvents: 5,
        fatalErrors: 0,
        streamDownMs: 0,
      };

      const result = await service.issueRefund(
        'purchase-1',
        'full_refund_buffer_ratio_high',
        telemetry,
        'full_refund_buffer_ratio_high',
        'v1.0'
      );

      expect(result.id).toBe('refund-1');
      expect(mockRefundWriter.create).toHaveBeenCalled();
      expect(mockPurchaseWriter.update).toHaveBeenCalledWith('purchase-1', {
        status: 'refunded',
        refundedAt: expect.any(Date),
      });
      expect(mockSmsWriter.sendNotification).toHaveBeenCalled();
    });

    it('throws BadRequestError when already refunded', async () => {
      const purchase = {
        id: 'purchase-1',
        amountCents: 1000,
      } as any;

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([
        { id: 'refund-1' } as Refund,
      ]);

      await expect(
        service.issueRefund(
          'purchase-1',
          'test',
          { watchMs: 0, bufferMs: 0, bufferEvents: 0, fatalErrors: 0, streamDownMs: 0 },
          'test',
          'v1.0'
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('processSquareRefund', () => {
    it('processes Square refund successfully', async () => {
      const purchase = {
        id: 'purchase-1',
        paymentProviderPaymentId: 'square-payment-123',
        currency: 'USD',
      } as any;

      const refund = {
        id: 'refund-1',
        purchaseId: 'purchase-1',
        amountCents: 1000,
        reasonCode: 'full_refund_buffer_ratio_high',
        processedAt: null,
      } as Refund;

      vi.mocked(mockRefundReader.getById).mockResolvedValue({
        ...refund,
        purchase,
      } as any);
      vi.mocked(squareClient.refundsApi.refundPayment).mockResolvedValue({} as any);
      vi.mocked(mockRefundWriter.update).mockResolvedValue({
        ...refund,
        processedAt: new Date(),
      });

      await service.processSquareRefund('refund-1');

      expect(squareClient.refundsApi.refundPayment).toHaveBeenCalled();
      expect(mockRefundWriter.update).toHaveBeenCalledWith('refund-1', {
        processedAt: expect.any(Date),
      });
    });

    it('skips processing if already processed', async () => {
      const refund = {
        id: 'refund-1',
        processedAt: new Date(),
      } as Refund;

      vi.mocked(mockRefundReader.getById).mockResolvedValue(refund as any);

      await service.processSquareRefund('refund-1');

      expect(squareClient.refundsApi.refundPayment).not.toHaveBeenCalled();
    });
  });
});
