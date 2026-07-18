/**
 * CloudflareDVRService Tests
 * 
 * TDD: Write tests first, then implement
 * Tests with mocked fetch for unit testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareDVRService } from '../CloudflareDVRService';

// Mock fetch globally
global.fetch = vi.fn();

describe('CloudflareDVRService', () => {
  let service: CloudflareDVRService;
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    service = new CloudflareDVRService({
      apiKey: 'test-api-key',
      accountId: 'test-account-id',
    });
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should create service with config', () => {
      expect(service).toBeDefined();
      expect(service.getProviderName()).toBe('cloudflare');
    });
  });

  describe('IStreamRecorder (TDD)', () => {
    it('should start recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uid: 'stream-abc-123',
            rtmps: {
              url: 'rtmps://live.cloudflare.com/live/',
              streamKey: 'abc123def',
            },
            recording: {
              mode: 'automatic',
            },
          },
          success: true,
        }),
      });

      const session = await service.startRecording('my-stream', {
        dvr: true,
        dvrWindowMinutes: 10,
      });

      expect(session.id).toBe('stream-abc-123');
      expect(session.streamKey).toBe('my-stream');
      expect(session.status).toBe('recording');
    });

    it('should stop recording', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {},
          success: true,
        }),
      });

      await service.stopRecording('stream-abc-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('stream-abc-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should get recording status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            status: {
              state: 'connected',
            },
            duration: 300.5,
          },
          success: true,
        }),
      });

      const status = await service.getRecordingStatus('stream-abc-123');

      expect(status.isRecording).toBe(true);
      expect(status.durationSeconds).toBe(300);
    });
  });

  describe('IClipGenerator (TDD)', () => {
    it('should create clip', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uid: 'clip-xyz-789',
            readyToStream: false,
          },
          success: true,
        }),
      });

      const clip = await service.createClip(
        'stream-abc-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      expect(clip.clipId).toBe('clip-xyz-789');
      expect(clip.status).toBe('pending');
    });

    it('should get clip status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uid: 'clip-xyz-789',
            readyToStream: true,
            duration: 30,
            thumbnail: 'https://cloudflare.com/thumb.jpg',
          },
          success: true,
        }),
      });

      const status = await service.getClipStatus('clip-xyz-789');

      expect(status.status).toBe('ready');
      expect(status.playbackUrl).toContain('cloudflarestream.com');
      expect(status.durationSeconds).toBe(30);
    });

    it('should cancel clip generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      await service.cancelClipGeneration('clip-xyz-789');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('clip-xyz-789'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('IClipReader (TDD)', () => {
    it('should get playback URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uid: 'clip-xyz-789',
            readyToStream: true, // Clip must be ready
          },
          success: true,
        }),
      });

      const url = await service.getPlaybackUrl('clip-xyz-789');

      expect(url).toContain('cloudflarestream.com');
      expect(url).toContain('clip-xyz-789');
    });

    it('should get clip metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            uid: 'clip-xyz-789',
            duration: 30,
            size: 15728640, // 15 MB
            created: '2026-01-13T12:00:00Z',
            thumbnail: 'https://cloudflare.com/thumb.jpg',
          },
          success: true,
        }),
      });

      const metadata = await service.getClipMetadata('clip-xyz-789');

      expect(metadata.clipId).toBe('clip-xyz-789');
      expect(metadata.durationSeconds).toBe(30);
      expect(metadata.sizeBytes).toBe(15728640);
    });

    it('should check if clip exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {},
          success: true,
        }),
      });

      const exists = await service.clipExists('clip-xyz-789');
      expect(exists).toBe(true);
    });

    it('should return false if clip does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const exists = await service.clipExists('fake-clip');
      expect(exists).toBe(false);
    });
  });

  describe('IClipWriter (TDD)', () => {
    it('should delete clip', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      await service.deleteClip('clip-xyz-789');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('clip-xyz-789'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should set public access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      await service.setPublicAccess('clip-xyz-789', true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('clip-xyz-789'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('IThumbnailGenerator (TDD)', () => {
    it('should generate thumbnail', async () => {
      const thumbnail = await service.generateThumbnail('stream-abc-123', 30);

      expect(thumbnail.url).toContain('cloudflarestream.com');
      expect(thumbnail.url).toContain('time=30s');
    });

    it('should generate sprite sheet', async () => {
      const sprite = await service.generateSpriteSheet('stream-abc-123', 10);

      expect(sprite.url).toContain('cloudflarestream.com');
      expect(sprite.url).toContain('thumbnails');
    });
  });

  describe('IDVRService (TDD)', () => {
    it('should return provider name', () => {
      expect(service.getProviderName()).toBe('cloudflare');
    });

    it('should pass health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [],
          success: true,
        }),
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

  describe('Error Handling (TDD)', () => {
    it('should throw error on failed API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(
        service.startRecording('stream-123', {})
      ).rejects.toThrow('Cloudflare');
    });

    it('should handle Cloudflare error response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          errors: [{ message: 'Invalid API key' }],
        }),
      });

      await expect(
        service.startRecording('stream-123', {})
      ).rejects.toThrow();
    });
  });
});

