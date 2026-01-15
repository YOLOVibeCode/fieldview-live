/**
 * MuxDVRService Tests
 * 
 * Unit tests for Mux provider
 * Note: These are unit tests with mocked fetch
 * Integration tests would hit real Mux API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MuxDVRService } from '../MuxDVRService';

// Mock fetch globally
global.fetch = vi.fn();

describe('MuxDVRService', () => {
  let service: MuxDVRService;
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    service = new MuxDVRService({
      tokenId: 'test-token-id',
      tokenSecret: 'test-token-secret',
    });
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should create service with config', () => {
      expect(service).toBeDefined();
      expect(service.getProviderName()).toBe('mux');
    });
  });

  describe('IStreamRecorder', () => {
    it('should start recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'live-stream-123',
            stream_key: 'abc-def-ghi',
            playback_ids: [{ id: 'playback-123' }],
            asset_id: 'asset-123',
          },
        }),
      });

      const session = await service.startRecording('my-stream', {
        dvr: true,
        dvrWindowMinutes: 10,
      });

      expect(session.id).toBe('live-stream-123');
      expect(session.streamKey).toBe('my-stream');
      expect(session.status).toBe('recording');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mux.com/video/v1/live-streams',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should stop recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await service.stopRecording('live-stream-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mux.com/video/v1/live-streams/live-stream-123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should get recording status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            status: 'active',
            max_continuous_duration: 300,
          },
        }),
      });

      const status = await service.getRecordingStatus('live-stream-123');

      expect(status.isRecording).toBe(true);
      expect(status.durationSeconds).toBe(300);
    });
  });

  describe('IClipGenerator', () => {
    it('should create clip', async () => {
      // Mock live stream lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            asset_id: 'asset-123',
          },
        }),
      });

      // Mock asset lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            playback_ids: [{ id: 'playback-123' }],
          },
        }),
      });

      // Mock clip creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'clip-123',
            status: 'preparing',
          },
        }),
      });

      const clip = await service.createClip(
        'live-stream-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      expect(clip.clipId).toBe('clip-123');
      expect(clip.status).toBe('pending');
    });

    it('should get clip status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'clip-123',
            status: 'ready',
            duration: 30,
            playback_ids: [{ id: 'playback-456' }],
          },
        }),
      });

      const status = await service.getClipStatus('clip-123');

      expect(status.status).toBe('ready');
      expect(status.playbackUrl).toContain('stream.mux.com');
      expect(status.durationSeconds).toBe(30);
    });
  });

  describe('IClipReader', () => {
    it('should get playback URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            playback_ids: [{ id: 'playback-789' }],
          },
        }),
      });

      const url = await service.getPlaybackUrl('clip-123');

      expect(url).toContain('stream.mux.com/playback-789.m3u8');
    });

    it('should get clip metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'clip-123',
            duration: 30,
            playback_ids: [{ id: 'playback-123' }],
            created_at: '2026-01-13T12:00:00Z',
            max_stored_resolution: '1080p',
            mp4_support: 'standard',
          },
        }),
      });

      const metadata = await service.getClipMetadata('clip-123');

      expect(metadata.clipId).toBe('clip-123');
      expect(metadata.durationSeconds).toBe(30);
      expect(metadata.format).toBe('mp4');
    });

    it('should check if clip exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const exists = await service.clipExists('clip-123');
      expect(exists).toBe(true);
    });

    it('should return false if clip does not exist', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Not found'));

      const exists = await service.clipExists('fake-clip');
      expect(exists).toBe(false);
    });
  });

  describe('IClipWriter', () => {
    it('should delete clip', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteClip('clip-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mux.com/video/v1/assets/clip-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should set public access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.setPublicAccess('clip-123', true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mux.com/video/v1/assets/clip-123',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('public'),
        })
      );
    });
  });

  describe('IThumbnailGenerator', () => {
    it('should generate thumbnail', async () => {
      // Mock live stream lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            asset_id: 'asset-123',
          },
        }),
      });

      // Mock asset lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            playback_ids: [{ id: 'playback-123' }],
          },
        }),
      });

      const thumbnail = await service.generateThumbnail('recording-123', 30);

      expect(thumbnail.url).toContain('image.mux.com');
      expect(thumbnail.url).toContain('time=30');
    });
  });

  describe('IDVRService', () => {
    it('should return provider name', () => {
      expect(service.getProviderName()).toBe('mux');
    });

    it('should pass health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should fail health check on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const healthy = await service.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on failed API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        service.startRecording('stream-123', {})
      ).rejects.toThrow('Mux');
    });
  });
});

