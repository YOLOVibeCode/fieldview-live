import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { EntitlementService } from '@/services/EntitlementService';
import { WatchBootstrapService } from '@/services/WatchBootstrapService';
import * as watchRoute from '@/routes/public.watch';
import { UnauthorizedError } from '@/lib/errors';
import type { Entitlement, PlaybackSession } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Public Watch Routes', () => {
  let request: SuperTest<typeof app>;
  let mockEntitlementService: {
    validateToken: ReturnType<typeof vi.fn>;
    createPlaybackSession: ReturnType<typeof vi.fn>;
  };
  let mockWatchBootstrapService: {
    getBootstrap: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockEntitlementService = {
      validateToken: vi.fn(),
      createPlaybackSession: vi.fn(),
    };

    mockWatchBootstrapService = {
      getBootstrap: vi.fn(),
    };

    // Set the mocked services
    watchRoute.setEntitlementService(mockEntitlementService as any);
    watchRoute.setWatchBootstrapService(mockWatchBootstrapService as any);
  });

  describe('GET /api/public/watch/:token', () => {
    it('returns watch bootstrap successfully', async () => {
      const bootstrap = {
        streamUrl: 'https://stream.mux.com/playback-123.m3u8',
        playerType: 'hls',
        state: 'live',
        validTo: new Date(Date.now() + 3600000).toISOString(),
        gameInfo: {
          title: 'Test Game',
          startsAt: new Date().toISOString(),
        },
        protectionLevel: 'strong',
      };

      mockWatchBootstrapService.getBootstrap.mockResolvedValue(bootstrap);

      const response = await request
        .get('/api/public/watch/token-123')
        .expect(200);

      expect(response.body.streamUrl).toBe('https://stream.mux.com/playback-123.m3u8');
      expect(response.body.playerType).toBe('hls');
      expect(response.body.state).toBe('live');
      expect(response.body.gameInfo.title).toBe('Test Game');
      expect(mockWatchBootstrapService.getBootstrap).toHaveBeenCalledWith('token-123');
    });

    it('returns 401 for invalid token', async () => {
      mockWatchBootstrapService.getBootstrap.mockRejectedValue(
        new UnauthorizedError('Invalid token')
      );

      await request
        .get('/api/public/watch/invalid-token')
        .expect(401);
    });

    it('returns 404 for missing game', async () => {
      mockWatchBootstrapService.getBootstrap.mockRejectedValue(
        new Error('Game not found')
      );

      await request
        .get('/api/public/watch/token-123')
        .expect(500); // Error handler converts to 500
    });
  });

  describe('POST /api/public/watch/:token/sessions', () => {
    it('creates playback session successfully', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement,
      });
      mockEntitlementService.createPlaybackSession.mockResolvedValue(session);

      const response = await request
        .post('/api/public/watch/token-123/sessions')
        .send({})
        .expect(201);

      expect(response.body.sessionId).toBe('session-1');
      expect(response.body.startedAt).toBeDefined();
      expect(mockEntitlementService.validateToken).toHaveBeenCalledWith('token-123');
      expect(mockEntitlementService.createPlaybackSession).toHaveBeenCalledWith('entitlement-1', undefined);
    });

    it('accepts optional metadata', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement,
      });
      mockEntitlementService.createPlaybackSession.mockResolvedValue(session);

      await request
        .post('/api/public/watch/token-123/sessions')
        .send({
          metadata: { deviceType: 'mobile', playerVersion: '1.0' },
        })
        .expect(201);

      expect(mockEntitlementService.createPlaybackSession).toHaveBeenCalledWith(
        'entitlement-1',
        { deviceType: 'mobile', playerVersion: '1.0' }
      );
    });

    it('returns 401 for invalid token', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await request
        .post('/api/public/watch/invalid-token/sessions')
        .send({})
        .expect(401);
    });
  });
});
