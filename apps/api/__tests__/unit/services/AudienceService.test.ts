import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudienceService } from '@/services/AudienceService';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IPurchaseReader } from '@/repositories/IPurchaseRepository';
import type { IEntitlementReader } from '@/repositories/IEntitlementRepository';
import type { IPlaybackSessionReader } from '@/repositories/IPlaybackSessionRepository';
import type { IViewerIdentityReader } from '@/repositories/IViewerIdentityRepository';
import type { Game, Purchase, Entitlement, PlaybackSession, ViewerIdentity } from '@prisma/client';

describe('AudienceService', () => {
  let service: AudienceService;
  let mockGameReader: IGameReader;
  let mockPurchaseReader: IPurchaseReader;
  let mockEntitlementReader: IEntitlementReader;
  let mockPlaybackSessionReader: IPlaybackSessionReader;
  let mockViewerIdentityReader: IViewerIdentityReader;

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

    service = new AudienceService(
      mockGameReader,
      mockPurchaseReader,
      mockEntitlementReader,
      mockPlaybackSessionReader,
      mockViewerIdentityReader
    );
  });

  describe('getOwnerAnalytics', () => {
    it('returns analytics for owner with games and purchases', async () => {
      const games = [
        {
          id: 'game-1',
          title: 'Game 1',
          ownerAccountId: 'owner-1',
        },
        {
          id: 'game-2',
          title: 'Game 2',
          ownerAccountId: 'owner-1',
        },
      ] as Game[];

      const purchases1 = [
        {
          id: 'purchase-1',
          gameId: 'game-1',
          viewerId: 'viewer-1',
          amountCents: 1000,
          ownerNetCents: 700,
          status: 'paid',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'purchase-2',
          gameId: 'game-1',
          viewerId: 'viewer-2',
          amountCents: 2000,
          ownerNetCents: 1400,
          status: 'paid',
          createdAt: new Date('2024-01-20'),
        },
      ] as Purchase[];

      const purchases2 = [
        {
          id: 'purchase-3',
          gameId: 'game-2',
          viewerId: 'viewer-3',
          amountCents: 1500,
          ownerNetCents: 1050,
          status: 'paid',
          createdAt: new Date('2024-02-10'),
        },
      ] as Purchase[];

      const entitlement1 = { id: 'entitlement-1', purchaseId: 'purchase-1' } as Entitlement;
      const entitlement2 = { id: 'entitlement-2', purchaseId: 'purchase-2' } as Entitlement;
      const sessions1 = [
        {
          id: 'session-1',
          totalWatchMs: 60000,
        },
      ] as PlaybackSession[];

      vi.mocked(mockGameReader.list).mockResolvedValue({ games, total: 2 });
      vi.mocked(mockPurchaseReader.listByGameId)
        .mockResolvedValueOnce(purchases1)
        .mockResolvedValueOnce(purchases2);
      vi.mocked(mockEntitlementReader.getByPurchaseId)
        .mockResolvedValueOnce(entitlement1)
        .mockResolvedValueOnce(entitlement2)
        .mockResolvedValueOnce(null);
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId)
        .mockResolvedValueOnce(sessions1)
        .mockResolvedValueOnce([]);

      const result = await service.getOwnerAnalytics('owner-1');

      expect(result.totalRevenueCents).toBe(3150); // 700 + 1400 + 1050
      expect(result.totalPurchases).toBe(3);
      expect(result.totalGames).toBe(2);
      expect(result.averagePurchaseAmountCents).toBe(1500); // (1000 + 2000 + 1500) / 3
      expect(result.purchaseToWatchConversionRate).toBeCloseTo(0.333, 2); // 1/3
      expect(result.revenueByGame).toHaveLength(2);
      expect(result.revenueByMonth).toHaveLength(2);
    });

    it('returns zero analytics for owner with no games', async () => {
      vi.mocked(mockGameReader.list).mockResolvedValue({ games: [], total: 0 });

      const result = await service.getOwnerAnalytics('owner-1');

      expect(result.totalRevenueCents).toBe(0);
      expect(result.totalPurchases).toBe(0);
      expect(result.totalGames).toBe(0);
      expect(result.averagePurchaseAmountCents).toBe(0);
      expect(result.purchaseToWatchConversionRate).toBe(0);
    });
  });

  describe('getGameAudience', () => {
    it('returns game audience with masked emails', async () => {
      const game = {
        id: 'game-1',
        title: 'Game 1',
        ownerAccountId: 'owner-1',
      } as Game;

      const purchases = [
        {
          id: 'purchase-1',
          gameId: 'game-1',
          viewerId: 'viewer-1',
          amountCents: 1000,
          status: 'paid',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'purchase-2',
          gameId: 'game-1',
          viewerId: 'viewer-2',
          amountCents: 2000,
          status: 'paid',
          createdAt: new Date('2024-01-20'),
        },
      ] as Purchase[];

      const viewer1 = {
        id: 'viewer-1',
        email: 'john@example.com',
      } as ViewerIdentity;

      const viewer2 = {
        id: 'viewer-2',
        email: 'jane@example.com',
      } as ViewerIdentity;

      const entitlement1 = { id: 'entitlement-1', purchaseId: 'purchase-1' } as Entitlement;
      const entitlement2 = { id: 'entitlement-2', purchaseId: 'purchase-2' } as Entitlement;

      const sessions1 = [
        {
          id: 'session-1',
          totalWatchMs: 60000,
          startedAt: new Date('2024-01-15T12:00:00Z'),
        },
      ] as PlaybackSession[];

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockPurchaseReader.listByGameId).mockResolvedValue(purchases);
      // Mock calls for purchasers (2 purchases)
      vi.mocked(mockViewerIdentityReader.getById)
        .mockResolvedValueOnce(viewer1) // purchaser 1
        .mockResolvedValueOnce(viewer2) // purchaser 2
        .mockResolvedValueOnce(viewer1); // watcher 1
      vi.mocked(mockEntitlementReader.getByPurchaseId)
        .mockResolvedValueOnce(entitlement1) // purchaser 1
        .mockResolvedValueOnce(entitlement2) // purchaser 2
        .mockResolvedValueOnce(entitlement1) // watcher 1
        .mockResolvedValueOnce(entitlement2); // watcher 2
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId)
        .mockResolvedValueOnce(sessions1) // purchaser 1 check
        .mockResolvedValueOnce([]) // purchaser 2 check
        .mockResolvedValueOnce(sessions1) // watcher 1 check
        .mockResolvedValueOnce([]); // watcher 2 check

      const result = await service.getGameAudience('game-1', 'owner-1', true);

      expect(result.gameId).toBe('game-1');
      expect(result.purchasers).toHaveLength(2);
      expect(result.purchasers[0].emailMasked).toBe('j***@example.com');
      expect(result.purchasers[0].watched).toBe(true);
      expect(result.purchasers[1].watched).toBe(false);
      expect(result.watchers).toHaveLength(1);
      expect(result.watchers[0]?.purchaseId).toBe('purchase-1');
      expect(result.purchaseToWatchConversionRate).toBe(0.5);
    });

    it('returns game audience with unmasked emails when maskEmails is false', async () => {
      const game = {
        id: 'game-1',
        title: 'Game 1',
        ownerAccountId: 'owner-1',
      } as Game;

      const purchases = [
        {
          id: 'purchase-1',
          gameId: 'game-1',
          viewerId: 'viewer-1',
          amountCents: 1000,
          status: 'paid',
          createdAt: new Date('2024-01-15'),
        },
      ] as Purchase[];

      const viewer1 = {
        id: 'viewer-1',
        email: 'john@example.com',
      } as ViewerIdentity;

      const entitlement1 = { id: 'entitlement-1', purchaseId: 'purchase-1' } as Entitlement;

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockPurchaseReader.listByGameId).mockResolvedValue(purchases);
      vi.mocked(mockViewerIdentityReader.getById).mockResolvedValue(viewer1);
      vi.mocked(mockEntitlementReader.getByPurchaseId).mockResolvedValue(entitlement1);
      vi.mocked(mockPlaybackSessionReader.listByEntitlementId).mockResolvedValue([]);

      const result = await service.getGameAudience('game-1', 'owner-1', false);

      expect(result.purchasers[0].emailMasked).toBe('john@example.com');
    });

    it('throws NotFoundError for non-existent game', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(null);

      await expect(service.getGameAudience('invalid-game', 'owner-1', true)).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws ForbiddenError when game does not belong to owner', async () => {
      const game = {
        id: 'game-1',
        ownerAccountId: 'owner-2',
      } as Game;

      vi.mocked(mockGameReader.getById).mockResolvedValue(game);

      await expect(service.getGameAudience('game-1', 'owner-1', true)).rejects.toThrow(
        ForbiddenError
      );
    });
  });
});
