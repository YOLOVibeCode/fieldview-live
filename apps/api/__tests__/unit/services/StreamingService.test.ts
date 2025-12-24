import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamingService } from '@/services/StreamingService';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import type { IStreamSourceReader, IStreamSourceWriter } from '@/repositories/IStreamSourceRepository';
import type { IGameReader, IGameWriter } from '@/repositories/IGameRepository';
import type { Game, StreamSource } from '@prisma/client';
import { muxClient } from '@/lib/mux';

// Mock Mux client
vi.mock('@/lib/mux', () => ({
  assertMuxConfigured: vi.fn(),
  muxClient: {
    video: {
      liveStreams: {
        create: vi.fn(),
      },
    },
  },
}));

describe('StreamingService', () => {
  let service: StreamingService;
  let mockStreamSourceReader: IStreamSourceReader;
  let mockStreamSourceWriter: IStreamSourceWriter;
  let mockGameReader: IGameReader;
  let mockGameWriter: IGameWriter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStreamSourceReader = {
      getByGameId: vi.fn(),
    };
    mockStreamSourceWriter = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
    };
    mockGameWriter = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new StreamingService(
      mockStreamSourceReader,
      mockStreamSourceWriter,
      mockGameReader,
      mockGameWriter
    );
  });

  describe('getStreamSource', () => {
    it('returns stream source for game', async () => {
      const streamSource = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
      } as StreamSource;

      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(streamSource);

      const result = await service.getStreamSource('game-1');

      expect(result).toEqual(streamSource);
      expect(mockStreamSourceReader.getByGameId).toHaveBeenCalledWith('game-1');
    });

    it('returns null when stream source does not exist', async () => {
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);

      const result = await service.getStreamSource('game-1');

      expect(result).toBeNull();
    });
  });

  describe('createMuxStream', () => {
    const mockGame = {
      id: 'game-1',
      ownerAccountId: 'owner-1',
    } as Game;

    const mockMuxStream = {
      id: 'mux-stream-123',
      stream_key: 'stream-key-abc',
      playback_ids: [{ id: 'playback-xyz' }],
    };

    it('creates Mux stream successfully', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(muxClient.video.liveStreams.create).mockResolvedValue(mockMuxStream as any);
      vi.mocked(mockStreamSourceWriter.create).mockResolvedValue({
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
        muxAssetId: 'mux-stream-123',
        muxPlaybackId: 'playback-xyz',
      } as StreamSource);
      vi.mocked(mockGameWriter.update).mockResolvedValue(mockGame);

      const result = await service.createMuxStream('game-1');

      expect(result.rtmpPublishUrl).toContain('global-live.mux.com');
      expect(result.streamKey).toBe('stream-key-abc');
      expect(result.playbackId).toBe('playback-xyz');
      expect(result.muxStreamId).toBe('mux-stream-123');
      expect(muxClient.video.liveStreams.create).toHaveBeenCalledWith({
        playback_policies: ['signed'],
        reconnect_window: 60,
      });
      expect(mockStreamSourceWriter.create).toHaveBeenCalledWith({
        gameId: 'game-1',
        type: 'mux_managed',
        protectionLevel: 'strong',
        muxAssetId: 'mux-stream-123',
        muxPlaybackId: 'playback-xyz',
        rtmpPublishUrl: 'rtmps://global-live.mux.com:443/app',
        rtmpStreamKey: 'stream-key-abc',
      });
      expect(mockGameWriter.update).toHaveBeenCalledWith('game-1', {
        streamSourceId: 'stream-1',
      });
    });

    it('throws NotFoundError when game does not exist', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(null);

      await expect(service.createMuxStream('game-1')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when stream source already exists', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue({
        id: 'existing-stream',
      } as StreamSource);

      await expect(service.createMuxStream('game-1')).rejects.toThrow(BadRequestError);
    });

    it('throws error when Mux stream creation fails', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(muxClient.video.liveStreams.create).mockResolvedValue({
        id: undefined,
      } as any);

      await expect(service.createMuxStream('game-1')).rejects.toThrow(
        'Failed to create Mux stream: missing required fields'
      );
    });
  });

  describe('configureByoHls', () => {
    const mockGame = {
      id: 'game-1',
      ownerAccountId: 'owner-1',
    } as Game;

    it('creates BYO HLS stream source successfully', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(mockStreamSourceWriter.create).mockResolvedValue({
        id: 'stream-1',
        gameId: 'game-1',
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
      } as StreamSource);
      vi.mocked(mockGameWriter.update).mockResolvedValue(mockGame);

      const result = await service.configureByoHls('game-1', 'https://example.com/stream.m3u8');

      expect(result.type).toBe('byo_hls');
      expect(result.protectionLevel).toBe('moderate');
      expect(result.hlsManifestUrl).toBe('https://example.com/stream.m3u8');
      expect(mockStreamSourceWriter.create).toHaveBeenCalledWith({
        gameId: 'game-1',
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
      });
    });

    it('updates existing stream source', async () => {
      const existingStream = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
      } as StreamSource;

      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(existingStream);
      vi.mocked(mockStreamSourceWriter.update).mockResolvedValue({
        id: 'stream-1',
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
      } as StreamSource);

      const result = await service.configureByoHls('game-1', 'https://example.com/stream.m3u8');

      expect(result.type).toBe('byo_hls');
      expect(mockStreamSourceWriter.update).toHaveBeenCalledWith('stream-1', {
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: 'https://example.com/stream.m3u8',
        muxAssetId: null,
        muxPlaybackId: null,
        rtmpPublishUrl: null,
        rtmpStreamKey: null,
        externalEmbedUrl: null,
        externalProvider: null,
      });
    });

    it('throws NotFoundError when game does not exist', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(null);

      await expect(service.configureByoHls('game-1', 'https://example.com/stream.m3u8')).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws BadRequestError for invalid URL', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);

      await expect(service.configureByoHls('game-1', 'not-a-url')).rejects.toThrow(BadRequestError);
    });
  });

  describe('configureByoRtmp', () => {
    const mockGame = {
      id: 'game-1',
      ownerAccountId: 'owner-1',
    } as Game;

    const mockMuxStream = {
      id: 'mux-stream-123',
      stream_key: 'stream-key-abc',
      playback_ids: [{ id: 'playback-xyz' }],
    };

    it('creates BYO RTMP stream source successfully', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(muxClient.video.liveStreams.create).mockResolvedValue(mockMuxStream as any);
      vi.mocked(mockStreamSourceWriter.create).mockResolvedValue({
        id: 'stream-1',
        gameId: 'game-1',
        type: 'byo_rtmp',
        protectionLevel: 'strong',
      } as StreamSource);
      vi.mocked(mockGameWriter.update).mockResolvedValue(mockGame);

      const result = await service.configureByoRtmp('game-1');

      expect(result.rtmpUrl).toContain('global-live.mux.com');
      expect(result.streamKey).toBe('stream-key-abc');
      expect(result.playbackId).toBe('playback-xyz');
      expect(mockStreamSourceWriter.create).toHaveBeenCalledWith({
        gameId: 'game-1',
        type: 'byo_rtmp',
        protectionLevel: 'strong',
        rtmpPublishUrl: expect.stringContaining('global-live.mux.com'),
        rtmpStreamKey: 'stream-key-abc',
        muxPlaybackId: 'playback-xyz',
        muxAssetId: 'mux-stream-123',
      });
    });

    it('uses provided RTMP URL when given', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(muxClient.video.liveStreams.create).mockResolvedValue(mockMuxStream as any);
      vi.mocked(mockStreamSourceWriter.create).mockResolvedValue({
        id: 'stream-1',
      } as StreamSource);
      vi.mocked(mockGameWriter.update).mockResolvedValue(mockGame);

      const result = await service.configureByoRtmp('game-1', 'rtmp://custom.example.com/app/stream');

      expect(result.rtmpUrl).toBe('rtmp://custom.example.com/app/stream');
    });

    it('updates existing stream source', async () => {
      const existingStream = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
      } as StreamSource;

      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(existingStream);
      vi.mocked(muxClient.video.liveStreams.create).mockResolvedValue(mockMuxStream as any);
      vi.mocked(mockStreamSourceWriter.update).mockResolvedValue({
        id: 'stream-1',
        type: 'byo_rtmp',
      } as StreamSource);

      await service.configureByoRtmp('game-1');

      expect(mockStreamSourceWriter.update).toHaveBeenCalled();
      expect(mockStreamSourceWriter.create).not.toHaveBeenCalled();
    });
  });

  describe('configureExternalEmbed', () => {
    const mockGame = {
      id: 'game-1',
      ownerAccountId: 'owner-1',
    } as Game;

    it('creates external embed stream source successfully', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(null);
      vi.mocked(mockStreamSourceWriter.create).mockResolvedValue({
        id: 'stream-1',
        gameId: 'game-1',
        type: 'external_embed',
        protectionLevel: 'best_effort',
        externalEmbedUrl: 'https://youtube.com/embed/abc123',
        externalProvider: 'youtube',
      } as StreamSource);
      vi.mocked(mockGameWriter.update).mockResolvedValue(mockGame);

      const result = await service.configureExternalEmbed(
        'game-1',
        'https://youtube.com/embed/abc123',
        'youtube'
      );

      expect(result.type).toBe('external_embed');
      expect(result.protectionLevel).toBe('best_effort');
      expect(result.externalEmbedUrl).toBe('https://youtube.com/embed/abc123');
      expect(result.externalProvider).toBe('youtube');
    });

    it('updates existing stream source', async () => {
      const existingStream = {
        id: 'stream-1',
        gameId: 'game-1',
        type: 'mux_managed',
      } as StreamSource;

      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);
      vi.mocked(mockStreamSourceReader.getByGameId).mockResolvedValue(existingStream);
      vi.mocked(mockStreamSourceWriter.update).mockResolvedValue({
        id: 'stream-1',
        type: 'external_embed',
        protectionLevel: 'best_effort',
      } as StreamSource);

      const result = await service.configureExternalEmbed(
        'game-1',
        'https://twitch.tv/embed/xyz',
        'twitch'
      );

      expect(result.type).toBe('external_embed');
      expect(mockStreamSourceWriter.update).toHaveBeenCalledWith('stream-1', {
        type: 'external_embed',
        protectionLevel: 'best_effort',
        externalEmbedUrl: 'https://twitch.tv/embed/xyz',
        externalProvider: 'twitch',
        muxAssetId: null,
        muxPlaybackId: null,
        hlsManifestUrl: null,
        rtmpPublishUrl: null,
        rtmpStreamKey: null,
      });
    });

    it('throws BadRequestError for invalid URL', async () => {
      vi.mocked(mockGameReader.getById).mockResolvedValue(mockGame);

      await expect(
        service.configureExternalEmbed('game-1', 'not-a-url', 'youtube')
      ).rejects.toThrow(BadRequestError);
    });
  });
});
