/**
 * MockDVRService Tests
 * 
 * TDD: Verify mock implementation matches all interfaces
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockDVRService } from '../MockDVRService';

describe('MockDVRService', () => {
  let service: MockDVRService;

  beforeEach(() => {
    service = new MockDVRService();
  });

  describe('IStreamRecorder', () => {
    it('should start recording', async () => {
      const session = await service.startRecording('stream-123', {
        dvr: true,
        dvrWindowMinutes: 10,
      });

      expect(session.id).toContain('mock-recording');
      expect(session.streamKey).toBe('stream-123');
      expect(session.status).toBe('recording');
    });

    it('should stop recording', async () => {
      const session = await service.startRecording('stream-123', {});
      await service.stopRecording(session.id);

      const status = await service.getRecordingStatus(session.id);
      expect(status.isRecording).toBe(false);
    });

    it('should get recording status', async () => {
      const session = await service.startRecording('stream-123', {});
      const status = await service.getRecordingStatus(session.id);

      expect(status.isRecording).toBe(true);
      expect(status.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(status.sizeBytes).toBeGreaterThan(0);
    });

    it('should get recording duration', async () => {
      const session = await service.startRecording('stream-123', {});
      const duration = await service.getRecordingDuration(session.id);

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw when stopping non-existent recording', async () => {
      await expect(service.stopRecording('fake-id')).rejects.toThrow('Recording not found');
    });
  });

  describe('IClipGenerator', () => {
    it('should create clip', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 },
        { generateThumbnail: true }
      );

      expect(clip.clipId).toContain('mock-clip');
      expect(clip.status).toBe('ready');
      expect(clip.playbackUrl).toContain('mock-cdn');
      expect(clip.thumbnailUrl).toBeDefined();
    });

    it('should create clip without thumbnail', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 },
        { generateThumbnail: false }
      );

      expect(clip.thumbnailUrl).toBeUndefined();
    });

    it('should get clip status', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      const status = await service.getClipStatus(clip.clipId);
      expect(status.status).toBe('ready');
      expect(status.playbackUrl).toBe(clip.playbackUrl);
    });

    it('should cancel clip generation', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      await service.cancelClipGeneration(clip.clipId);

      const status = await service.getClipStatus(clip.clipId);
      expect(status.status).toBe('failed');
    });

    it('should throw when getting status of non-existent clip', async () => {
      await expect(service.getClipStatus('fake-id')).rejects.toThrow('Clip not found');
    });
  });

  describe('IClipReader', () => {
    it('should get playback URL', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      const url = await service.getPlaybackUrl(clip.clipId);
      expect(url).toContain('mock-cdn');
    });

    it('should get playback URL with options', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      const url = await service.getPlaybackUrl(clip.clipId, {
        expiresInSeconds: 3600,
        quality: 'high',
      });

      expect(url).toContain('expires=');
      expect(url).toContain('quality=high');
    });

    it('should get clip metadata', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      const metadata = await service.getClipMetadata(clip.clipId);
      expect(metadata.clipId).toBe(clip.clipId);
      expect(metadata.durationSeconds).toBe(30);
      expect(metadata.format).toBe('mp4');
    });

    it('should check if clip exists', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      expect(await service.clipExists(clip.clipId)).toBe(true);
      expect(await service.clipExists('fake-id')).toBe(false);
    });
  });

  describe('IClipWriter', () => {
    it('should delete clip', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      await service.deleteClip(clip.clipId);
      expect(await service.clipExists(clip.clipId)).toBe(false);
    });

    it('should update expiration', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      const expiresAt = new Date(Date.now() + 86400000);
      await service.updateExpiration(clip.clipId, expiresAt);

      const metadata = await service.getClipMetadata(clip.clipId);
      expect(metadata.expiresAt).toEqual(expiresAt);
    });

    it('should set public access', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      await service.setPublicAccess(clip.clipId, true);
      // No direct way to verify, but shouldn't throw
    });

    it('should throw when deleting non-existent clip', async () => {
      await expect(service.deleteClip('fake-id')).rejects.toThrow('Clip not found');
    });
  });

  describe('IThumbnailGenerator', () => {
    it('should generate thumbnail', async () => {
      const thumbnail = await service.generateThumbnail('recording-123', 30);

      expect(thumbnail.url).toContain('mock-cdn');
      expect(thumbnail.width).toBe(1280);
      expect(thumbnail.height).toBe(720);
      expect(thumbnail.format).toBe('jpg');
    });

    it('should generate sprite sheet', async () => {
      const sprite = await service.generateSpriteSheet('recording-123', 10);

      expect(sprite.url).toContain('mock-cdn');
      expect(sprite.thumbnailsPerRow).toBe(10);
      expect(sprite.totalThumbnails).toBe(100);
    });
  });

  describe('IDVRService', () => {
    it('should return provider name', () => {
      expect(service.getProviderName()).toBe('mock');
    });

    it('should pass health check', async () => {
      expect(await service.healthCheck()).toBe(true);
    });

    it('should fail health check when shouldFail is true', async () => {
      service._setShouldFail(true);
      expect(await service.healthCheck()).toBe(false);
    });
  });

  describe('Test Helpers', () => {
    it('should reset all data', async () => {
      await service.startRecording('stream-123', {});
      await service.createClip('recording-123', { startSeconds: 10, endSeconds: 40 });

      service._reset();

      expect(service._getRecordings()).toHaveLength(0);
      expect(service._getClips()).toHaveLength(0);
    });

    it('should get all recordings', async () => {
      await service.startRecording('stream-1', {});
      await service.startRecording('stream-2', {});

      const recordings = service._getRecordings();
      expect(recordings).toHaveLength(2);
    });

    it('should get all clips', async () => {
      await service.createClip('rec-1', { startSeconds: 0, endSeconds: 30 });
      await service.createClip('rec-2', { startSeconds: 0, endSeconds: 30 });

      const clips = service._getClips();
      expect(clips).toHaveLength(2);
    });

    it('should force operations to fail', async () => {
      service._setShouldFail(true);

      await expect(service.startRecording('stream-123', {})).rejects.toThrow();
      await expect(
        service.createClip('rec-123', { startSeconds: 0, endSeconds: 30 })
      ).rejects.toThrow();
    });

    it('should manually set clip status', async () => {
      const clip = await service.createClip(
        'recording-123',
        { startSeconds: 10, endSeconds: 40 }
      );

      service._setClipStatus(clip.clipId, 'pending');
      const status = await service.getClipStatus(clip.clipId);
      expect(status.status).toBe('pending');
    });
  });
});

