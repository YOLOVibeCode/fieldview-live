import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchBootstrapService } from '@/services/WatchBootstrapService';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import type { IEntitlementReader } from '@/services/IEntitlementService';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IPurchaseReader } from '@/repositories/IPurchaseRepository';
import type { IStreamSourceReader } from '@/repositories/IStreamSourceRepository';
import type { Entitlement, Game, Purchase, StreamSource } from '@prisma/client';

describe('WatchBootstrapService', () => {
  let service: WatchBootstrapService;
  let mockEntitlementReader: IEntitlementReader;
  let mockGameReader: IGameReader;
  let mockPurchaseReader: IPurchaseReader;
  let mockStreamSourceReader: IStreamSourceReader;

  beforeEach(() => {
    mockEntitlementReader = {
      validateToken: vi.fn(),
    };
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
    mockStreamSourceReader = {
      getByGameId: vi.fn(),
    };
    service = new WatchBootstrapService(
      mockEntitlementReader,
      mockGameReader,
      mockPurchaseReader,
      mockStreamSourceReader
    );
  });

  describe('getBootstrap', () => {
    it('returns bootstrap for Mux-managed stream', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() - 1000),
        state: 'live',
        streamSourceId: 'stream-1',
      } as Game;

      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
        muxPlaybackId: 'playback-123',
      } as StreamSource;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getBootstrap('token-123');

      expect(result.streamUrl).toBe('https://stream.mux.com/playback-123.m3u8');
      expect(result.playerType).toBe('hls');
      expect(result.state).toBe('live');
      expect(result.protectionLevel).toBe('strong');
      expect(result.gameInfo.title).toBe('Test Game');
    });

    it('returns bootstrap for BYO HLS stream', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() - 1000),
        state: 'live',
        streamSourceId: 'stream-1',
      } as Game;

      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
      } as StreamSource;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getBootstrap('token-123');

      expect(result.streamUrl).toBe('https://example.com/stream.m3u8');
      expect(result.playerType).toBe('hls');
      expect(result.protectionLevel).toBe('moderate');
    });

    it('returns bootstrap for external embed', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() - 1000),
        state: 'live',
        streamSourceId: 'stream-1',
      } as Game;

      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'external_embed',
        protectionLevel: 'best_effort',
        externalEmbedUrl: 'https://youtube.com/embed/abc123',
      } as StreamSource;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getBootstrap('token-123');

      expect(result.streamUrl).toBe('https://youtube.com/embed/abc123');
      expect(result.playerType).toBe('embed');
      expect(result.protectionLevel).toBe('best_effort');
    });

    it('returns unavailable state when no stream source', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() - 1000),
        state: 'active',
        streamSourceId: null,
      } as Game;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);

      const result = await service.getBootstrap('token-123');

      expect(result.state).toBe('unavailable');
      expect(result.streamUrl).toBe('');
    });

    it('throws UnauthorizedError for invalid token', async () => {
      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(service.getBootstrap('invalid-token')).rejects.toThrow(UnauthorizedError);
    });

    it('determines state correctly (not_started)', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() + 3600000), // Future
        state: 'active',
        streamSourceId: 'stream-1',
      } as Game;

      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
        muxPlaybackId: 'playback-123',
      } as StreamSource;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getBootstrap('token-123');

      expect(result.state).toBe('not_started');
    });

    it('determines state correctly (ended)', async () => {
      const entitlement = {
        id: 'entitlement-1',
        purchaseId: 'purchase-1',
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const purchase = {
        id: 'purchase-1',
        gameId: 'game-1',
      } as Purchase;

      const game = {
        id: 'game-1',
        title: 'Test Game',
        startsAt: new Date(Date.now() - 7200000),
        state: 'ended',
        streamSourceId: 'stream-1',
      } as Game;

      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
        muxPlaybackId: 'playback-123',
      } as StreamSource;

      vi.mocked(mockEntitlementReader.validateToken).mockResolvedValue({
        valid: true,
        entitlement,
      });
      vi.mocked(mockPurchaseReader.getById).mockResolvedValue(purchase);
      vi.mocked(mockGameReader.getById).mockResolvedValue(game);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getBootstrap('token-123');

      expect(result.state).toBe('ended');
    });
  });
});
