import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { StreamingService } from '@/services/StreamingService';
import { verifyToken } from '@/lib/jwt';
import * as streamsRoute from '@/routes/owners.streams';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import type { Game, StreamSource } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock Mux client
vi.mock('@/lib/mux', () => ({
  muxClient: {
    video: {
      liveStreams: {
        create: vi.fn(),
      },
    },
  },
}));

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

// Mock GameRepository
const mockGameRepositoryGetById = vi.fn();
vi.mock('@/repositories/implementations/GameRepository', () => ({
  GameRepository: vi.fn().mockImplementation(() => ({
    getById: mockGameRepositoryGetById,
  })),
}));

describe('Owner Stream Source Routes', () => {
  let request: SuperTest<typeof app>;
  let mockStreamingService: {
    createMuxStream: ReturnType<typeof vi.fn>;
    configureByoHls: ReturnType<typeof vi.fn>;
    configureByoRtmp: ReturnType<typeof vi.fn>;
    configureExternalEmbed: ReturnType<typeof vi.fn>;
  };
  let mockGame: Game;
  let mockToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    request = agent(app);

    mockStreamingService = {
      createMuxStream: vi.fn(),
      configureByoHls: vi.fn(),
      configureByoRtmp: vi.fn(),
      configureExternalEmbed: vi.fn(),
    };

    mockGame = {
      id: 'game-1',
      ownerAccountId: 'owner-1',
      title: 'Test Game',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startsAt: new Date(),
      priceCents: 1000,
      currency: 'USD',
      keywordCode: 'TEST',
      qrUrl: 'https://example.com/qr',
      state: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Game;

    // Mock GameRepository.getById to return the mock game
    mockGameRepositoryGetById.mockResolvedValue(mockGame);

    // Mock JWT token verification
    mockToken = 'mock-jwt-token';
    // Ensure no cross-test returnValueOnce() leakage from other files/workers
    vi.mocked(verifyToken).mockReset();
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'owner-1',
      email: 'test@example.com',
    });

    // Set the mocked service
    streamsRoute.setStreamingService(mockStreamingService as any);
  });

  describe('POST /api/owners/me/games/:gameId/streams/mux', () => {
    it('creates Mux stream successfully', async () => {
      const config = {
        rtmpPublishUrl: 'rtmp://global-live.mux.com:443/app/stream-key',
        streamKey: 'stream-key',
        playbackId: 'playback-xyz',
        muxStreamId: 'mux-stream-123',
      };

      mockStreamingService.createMuxStream.mockResolvedValue(config);

      const response = await request
        .post('/api/owners/me/games/game-1/streams/mux')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(201);

      expect(response.body.rtmpPublishUrl).toBe(config.rtmpPublishUrl);
      expect(response.body.streamKey).toBe(config.streamKey);
      expect(response.body.playbackId).toBe(config.playbackId);
      expect(mockStreamingService.createMuxStream).toHaveBeenCalledWith('game-1');
    });

    it('returns 401 without authentication', async () => {
      await request
        .post('/api/owners/me/games/game-1/streams/mux')
        .send({})
        .expect(401);
    });

    it('returns 404 for non-existent game', async () => {
      mockStreamingService.createMuxStream.mockRejectedValue(new NotFoundError('Game not found'));

      await request
        .post('/api/owners/me/games/invalid-game/streams/mux')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(404);
    });
  });

  describe('POST /api/owners/me/games/:gameId/streams/byo-hls', () => {
    it('configures BYO HLS successfully', async () => {
      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
      } as StreamSource;

      mockStreamingService.configureByoHls.mockResolvedValue(streamSource);

      const response = await request
        .post('/api/owners/me/games/game-1/streams/byo-hls')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          manifestUrl: 'https://example.com/stream.m3u8',
        })
        .expect(201);

      expect(response.body.type).toBe('byo_hls');
      expect(response.body.protectionLevel).toBe('moderate');
      expect(response.body.hlsManifestUrl).toBe('https://example.com/stream.m3u8');
      expect(mockStreamingService.configureByoHls).toHaveBeenCalledWith(
        'game-1',
        'https://example.com/stream.m3u8'
      );
    });

    it('returns 400 for invalid manifest URL', async () => {
      await request
        .post('/api/owners/me/games/game-1/streams/byo-hls')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          manifestUrl: 'not-a-url',
        })
        .expect(400);
    });

    it('returns 400 for missing manifest URL', async () => {
      await request
        .post('/api/owners/me/games/game-1/streams/byo-hls')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/owners/me/games/:gameId/streams/byo-rtmp', () => {
    it('configures BYO RTMP successfully', async () => {
      const config = {
        rtmpUrl: 'rtmp://global-live.mux.com:443/app/stream-key',
        streamKey: 'stream-key',
        playbackId: 'playback-xyz',
        muxStreamId: 'mux-stream-123',
      };

      mockStreamingService.configureByoRtmp.mockResolvedValue(config);

      const response = await request
        .post('/api/owners/me/games/game-1/streams/byo-rtmp')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(201);

      expect(response.body.rtmpUrl).toBe(config.rtmpUrl);
      expect(response.body.streamKey).toBe(config.streamKey);
      expect(response.body.playbackId).toBe(config.playbackId);
      expect(mockStreamingService.configureByoRtmp).toHaveBeenCalledWith('game-1', undefined);
    });

    it('accepts optional RTMP URL', async () => {
      const config = {
        rtmpUrl: 'rtmp://custom.example.com/app/stream',
        streamKey: 'stream-key',
        playbackId: 'playback-xyz',
        muxStreamId: 'mux-stream-123',
      };

      mockStreamingService.configureByoRtmp.mockResolvedValue(config);

      await request
        .post('/api/owners/me/games/game-1/streams/byo-rtmp')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          rtmpUrl: 'rtmp://custom.example.com/app/stream',
        })
        .expect(201);

      expect(mockStreamingService.configureByoRtmp).toHaveBeenCalledWith(
        'game-1',
        'rtmp://custom.example.com/app/stream'
      );
    });
  });

  describe('POST /api/owners/me/games/:gameId/streams/external-embed', () => {
    it('configures external embed successfully', async () => {
      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'external_embed',
        protectionLevel: 'best_effort',
        externalEmbedUrl: 'https://youtube.com/embed/abc123',
        externalProvider: 'youtube',
      } as StreamSource;

      mockStreamingService.configureExternalEmbed.mockResolvedValue(streamSource);

      const response = await request
        .post('/api/owners/me/games/game-1/streams/external-embed')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          embedUrl: 'https://youtube.com/embed/abc123',
          provider: 'youtube',
        })
        .expect(201);

      expect(response.body.type).toBe('external_embed');
      expect(response.body.protectionLevel).toBe('best_effort');
      expect(response.body.externalEmbedUrl).toBe('https://youtube.com/embed/abc123');
      expect(response.body.externalProvider).toBe('youtube');
      expect(mockStreamingService.configureExternalEmbed).toHaveBeenCalledWith(
        'game-1',
        'https://youtube.com/embed/abc123',
        'youtube'
      );
    });

    it('returns 400 for invalid embed URL', async () => {
      await request
        .post('/api/owners/me/games/game-1/streams/external-embed')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          embedUrl: 'not-a-url',
          provider: 'youtube',
        })
        .expect(400);
    });

    it('returns 400 for invalid provider', async () => {
      await request
        .post('/api/owners/me/games/game-1/streams/external-embed')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          embedUrl: 'https://youtube.com/embed/abc123',
          provider: 'invalid',
        })
        .expect(400);
    });
  });
});
