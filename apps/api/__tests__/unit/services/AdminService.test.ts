import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '@/services/AdminService';
import { NotFoundError } from '@/lib/errors';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IPurchaseReader } from '@/repositories/IPurchaseRepository';
import type { IEntitlementReader } from '@/repositories/IEntitlementRepository';
import type { IPlaybackSessionReader } from '@/repositories/IPlaybackSessionRepository';
import type { IViewerIdentityReader } from '@/repositories/IViewerIdentityRepository';
import type { IRefundReader } from '@/repositories/IRefundRepository';
import { AudienceService } from '@/services/AudienceService';
import type { Game, Purchase, Entitlement, PlaybackSession, ViewerIdentity, Refund } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let mockGameReader: IGameReader;
  let mockPurchaseReader: IPurchaseReader;
  let mockEntitlementReader: IEntitlementReader;
  let mockPlaybackSessionReader: IPlaybackSessionReader;
  let mockViewerIdentityReader: IViewerIdentityReader;
  let mockRefundReader: IRefundReader;
  let mockAudienceService: AudienceService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
    };
    mockPurchaseReader = {
      getById: vi.fn(),
      getByPaymentProviderId: vi.fn(),
      listByGameId: vi.fn(),
      listByViewerId: vi.fn(),
    };
    mockEntitlementReader = {
      validateToken: vi.fn(),
      getByPurchaseId: vi.fn(),
    };
    mockPlaybackSessionReader = {
      getById: vi.fn(),
      listByEntitlementId: vi.fn(),
    };
    mockViewerIdentityReader = {
      getById: vi.fn(),
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
    };
    mockRefundReader = {
      getById: vi.fn(),
      getByPurchaseId: vi.fn(),
    };
    mockAudienceService = {
      getGameAudience: vi.fn(),
      getOwnerAnalytics: vi.fn(),
    } as unknown as AudienceService;

    service = new AdminService(
      mockGameReader,
      mockPurchaseReader,
      mockEntitlementReader,
      mockPlaybackSessionReader,
      mockViewerIdentityReader,
      mockRefundReader,
      mockAudienceService
    );
  });

  describe('search', () => {
    it('searches viewers by email', async () => {
      const viewer = {
        id: 'viewer-1',
        email: 'john@example.com',
        phoneE164: '+1234567890',
      } as ViewerIdentity;

      const purchases = [
        { id: 'purchase-1', viewerId: 'viewer-1' },
        { id: 'purchase-2', viewerId: 'viewer-1' },
      ] as Purchase[];

      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseReader.listByViewerId).mockResolvedValue(purchases);

      const results = await service.search('john@example.com', 'support_admin');

      expect(results.viewers).toHaveLength(1);
      expect(results.viewers[0].email).toBe('j***@example.com'); // Masked for SupportAdmin
      expect(results.viewers[0].purchaseCount).toBe(2);
    });

    it('searches viewers by email (SuperAdmin sees full email)', async () => {
      const viewer = {
        id: 'viewer-1',
        email: 'john@example.com',
        phoneE164: '+1234567890',
      } as ViewerIdentity;

      const purchases = [] as Purchase[];

      vi.mocked(mockViewerIdentityReader.getByEmail).mockResolvedValue(viewer);
      vi.mocked(mockPurchaseReader.listByViewerId).mockResolvedValue(purchases);

      const results = await service.search('john@example.com', 'super_admin');

      expect(results.viewers[0].email).toBe('john@example.com'); // Full email for SuperAdmin
    });

    it('searches games by keyword', async () => {
      const game = {
        id: 'game-1',
        title: 'Test Game',
        keywordCode: 'TEST',
        ownerAccountId: 'owner-1',
      } as Game;

      vi.mocked(mockGameReader.getByKeywordCode).mockResolvedValue(game);

      const results = await service.search('TEST', 'support_admin');

      expect(results.games).toHaveLength(1);
      expect(results.games[0].keywordCode).toBe('TEST');
    });

    it('searches purchases by ID (UUID format)', async () => {
      const purchaseId = '12345678-1234-1234-1234-123456789012';
      const purchase = {
        id: purchaseId,
        gameId: 'game-1',
        viewerId: 'viewer-1',
        amountCents: 1000,
        status: 'paid',
        createdAt: new Date(),
      } as Purchase;

      const viewer = {
        id: 'viewer-1',
        email: 'john@example.com',
      } as ViewerIdentity;

      const game = {
        id: 'game-1',
        title: 'Test Game',
      } as Game;

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(viewer);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);

      const results = await service.search(purchaseId, 'support_admin');

      expect(results.purchases).toHaveLength(1);
      expect(results.purchases[0].id).toBe(purchaseId);
    });
  });

  describe('getPurchaseTimeline', () => {
    it('returns purchase timeline with all events', async () => {
      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
        viewerId: 'viewer-1',
        amountCents: 1000,
        status: 'paid',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        paidAt: new Date('2024-01-01T12:01:00Z'),
      } as Purchase;

      const viewer = {
        id: 'viewer-1',
        email: 'john@example.com',
      } as ViewerIdentity;

      const game = {
        id: 'game-1',
        title: 'Test Game',
      } as Game;

      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        createdAt: new Date('2024-01-01T12:02:00Z'),
        validFrom: new Date('2024-01-01T12:00:00Z'),
        validTo: new Date('2024-01-01T14:00:00Z'),
      } as Entitlement;

      const sessions = [
        {
          id: 'session-1',
          startedAt: new Date('2024-01-01T12:03:00Z'),
          endedAt: new Date('2024-01-01T12:10:00Z'),
          totalWatchMs: 420000,
          bufferEvents: 2,
        },
      ] as PlaybackSession[];

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(viewer);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(entitlement);
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId).mockResolvedValue(sessions);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([]);

      const timeline = await service.getPurchaseTimeline('purchase-1', 'support_admin');

      expect(timeline.purchaseId).toBe('purchase-1');
      expect(timeline.events.length).toBeGreaterThan(0);
      expect(timeline.events.some((e) => e.type === 'payment_attempt')).toBe(true);
      expect(timeline.events.some((e) => e.type === 'payment_success')).toBe(true);
      expect(timeline.events.some((e) => e.type === 'entitlement_created')).toBe(true);
      expect(timeline.events.some((e) => e.type === 'session_started')).toBe(true);
      expect(timeline.events.some((e) => e.type === 'session_ended')).toBe(true);
    });

    it('includes refund events in timeline', async () => {
      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
        viewerId: 'viewer-1',
        amountCents: 1000,
        status: 'refunded',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        paidAt: new Date('2024-01-01T12:01:00Z'),
      } as Purchase;

      const viewer = {
        id: 'viewer-1',
        email: 'john@example.com',
      } as ViewerIdentity;

      const game = {
        id: 'game-1',
        title: 'Test Game',
      } as Game;

      const refund = {
        id: 'refund-1',
        purchaseId: 'purchase-1',
        amountCents: 1000,
        reasonCode: 'full_refund_buffer_ratio_high',
        createdAt: new Date('2024-01-01T13:00:00Z'),
      } as Refund;

      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(viewer);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(null);
      vi.mocked(mockRefundReader.getByPurchaseId).mockResolvedValue([refund]);

      const timeline = await service.getPurchaseTimeline('purchase-1', 'support_admin');

      expect(timeline.events.some((e) => e.type === 'refund_issued')).toBe(true);
    });

    it('throws NotFoundError for non-existent purchase', async () => {
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(null);

      await expect(service.getPurchaseTimeline('invalid-purchase', 'support_admin')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getGameAudience', () => {
    it('delegates to AudienceService with correct maskEmails parameter', async () => {
      const mockAudience = {
        gameId: 'game-1',
        purchasers: [],
        watchers: [],
        purchaseToWatchConversionRate: 0,
      };

      vi.mocked(mockAudienceService.getGameAudience).mockResolvedValue(mockAudience);

      await service.getGameAudience('game-1', 'owner-1', 'support_admin');

      expect(mockAudienceService.getGameAudience).toHaveBeenCalledWith('game-1', 'owner-1', true); // Masked
    });

    it('delegates to AudienceService with unmasked emails for SuperAdmin', async () => {
      const mockAudience = {
        gameId: 'game-1',
        purchasers: [],
        watchers: [],
        purchaseToWatchConversionRate: 0,
      };

      vi.mocked(mockAudienceService.getGameAudience).mockResolvedValue(mockAudience);

      await service.getGameAudience('game-1', 'owner-1', 'super_admin');

      expect(mockAudienceService.getGameAudience).toHaveBeenCalledWith('game-1', 'owner-1', false); // Unmasked
    });
  });
});
