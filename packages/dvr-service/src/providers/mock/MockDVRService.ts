/**
 * MockDVRService
 * 
 * In-memory implementation for testing
 * No actual cloud calls, instant responses
 * Implements all ISP interfaces
 */

import {
  IDVRService,
  IStreamRecorder,
  IClipGenerator,
  IClipReader,
  IClipWriter,
  IThumbnailGenerator,
  RecordingOptions,
  RecordingSession,
  RecordingStatus,
  TimeRange,
  ClipOptions,
  ClipCreationResult,
  ClipStatus,
  PlaybackOptions,
  ClipMetadata,
  ThumbnailResult,
  SpriteSheetResult,
} from '../../interfaces';

export class MockDVRService implements IDVRService {
  private recordings = new Map<string, RecordingSession>();
  private clips = new Map<string, ClipCreationResult & { metadata?: ClipMetadata }>();
  private shouldFail = false; // Test helper

  // ========================================
  // IStreamRecorder Implementation
  // ========================================

  async startRecording(
    streamKey: string,
    options: RecordingOptions
  ): Promise<RecordingSession> {
    if (this.shouldFail) {
      throw new Error('Mock: Recording failed');
    }

    const session: RecordingSession = {
      id: `mock-recording-${Date.now()}-${Math.random()}`,
      streamKey,
      startedAt: new Date(),
      status: 'recording',
      providerMetadata: { mock: true, options },
    };

    this.recordings.set(session.id, session);
    return session;
  }

  async stopRecording(sessionId: string): Promise<void> {
    const session = this.recordings.get(sessionId);
    if (!session) {
      throw new Error(`Recording not found: ${sessionId}`);
    }

    session.status = 'stopped';
    this.recordings.set(sessionId, session);
  }

  async getRecordingStatus(sessionId: string): Promise<RecordingStatus> {
    const session = this.recordings.get(sessionId);
    if (!session) {
      throw new Error(`Recording not found: ${sessionId}`);
    }

    const duration = Math.floor(
      (Date.now() - session.startedAt.getTime()) / 1000
    );

    return {
      isRecording: session.status === 'recording',
      durationSeconds: duration,
      sizeBytes: duration * 1024 * 100, // Mock: 100KB/second
    };
  }

  async getRecordingDuration(sessionId: string): Promise<number> {
    const status = await this.getRecordingStatus(sessionId);
    return status.durationSeconds;
  }

  // ========================================
  // IClipGenerator Implementation
  // ========================================

  async createClip(
    recordingId: string,
    timeRange: TimeRange,
    options?: ClipOptions
  ): Promise<ClipCreationResult> {
    if (this.shouldFail) {
      throw new Error('Mock: Clip creation failed');
    }

    const clipId = `mock-clip-${Date.now()}-${Math.random()}`;
    const duration = timeRange.endSeconds - timeRange.startSeconds;

    const clip: ClipCreationResult = {
      clipId,
      status: 'ready', // Mock is instant
      playbackUrl: `https://mock-cdn.fieldview.test/clips/${clipId}.mp4`,
      thumbnailUrl: options?.generateThumbnail
        ? `https://mock-cdn.fieldview.test/thumbs/${clipId}.jpg`
        : undefined,
      providerMetadata: {
        mock: true,
        recordingId,
        timeRange,
        options,
      },
    };

    // Store with metadata
    this.clips.set(clipId, {
      ...clip,
      metadata: {
        clipId,
        durationSeconds: duration,
        sizeBytes: duration * 1024 * 50, // Mock: 50KB/second
        createdAt: new Date(),
        playbackUrl: clip.playbackUrl!,
        thumbnailUrl: clip.thumbnailUrl,
        format: options?.format || 'mp4',
        quality: options?.quality || 'high',
      },
    });

    return clip;
  }

  async getClipStatus(clipId: string): Promise<ClipStatus> {
    const clip = this.clips.get(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    return {
      clipId,
      status: clip.status,
      playbackUrl: clip.playbackUrl,
      thumbnailUrl: clip.thumbnailUrl,
      durationSeconds: clip.metadata?.durationSeconds,
      sizeBytes: clip.metadata?.sizeBytes,
    };
  }

  async cancelClipGeneration(clipId: string): Promise<void> {
    const clip = this.clips.get(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    clip.status = 'failed';
    this.clips.set(clipId, clip);
  }

  // ========================================
  // IClipReader Implementation
  // ========================================

  async getPlaybackUrl(
    clipId: string,
    options?: PlaybackOptions
  ): Promise<string> {
    const clip = this.clips.get(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    let url = clip.playbackUrl!;

    // Simulate signed URL with expiry
    if (options?.expiresInSeconds) {
      url += `?expires=${Date.now() + options.expiresInSeconds * 1000}`;
    }

    // Simulate quality parameter
    if (options?.quality) {
      url += url.includes('?') ? '&' : '?';
      url += `quality=${options.quality}`;
    }

    return url;
  }

  async getClipMetadata(clipId: string): Promise<ClipMetadata> {
    const clip = this.clips.get(clipId);
    if (!clip || !clip.metadata) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    return clip.metadata;
  }

  async clipExists(clipId: string): Promise<boolean> {
    return this.clips.has(clipId);
  }

  // ========================================
  // IClipWriter Implementation
  // ========================================

  async deleteClip(clipId: string): Promise<void> {
    if (!this.clips.has(clipId)) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    this.clips.delete(clipId);
  }

  async updateExpiration(clipId: string, expiresAt: Date): Promise<void> {
    const clip = this.clips.get(clipId);
    if (!clip || !clip.metadata) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    clip.metadata.expiresAt = expiresAt;
    this.clips.set(clipId, clip);
  }

  async setPublicAccess(clipId: string, isPublic: boolean): Promise<void> {
    const clip = this.clips.get(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    clip.providerMetadata = {
      ...clip.providerMetadata,
      isPublic,
    };
    this.clips.set(clipId, clip);
  }

  // ========================================
  // IThumbnailGenerator Implementation
  // ========================================

  async generateThumbnail(
    recordingId: string,
    timestampSeconds: number
  ): Promise<ThumbnailResult> {
    if (this.shouldFail) {
      throw new Error('Mock: Thumbnail generation failed');
    }

    return {
      url: `https://mock-cdn.fieldview.test/thumbs/${recordingId}-${timestampSeconds}.jpg`,
      width: 1280,
      height: 720,
      format: 'jpg',
    };
  }

  async generateSpriteSheet(
    recordingId: string,
    intervalSeconds: number
  ): Promise<SpriteSheetResult> {
    if (this.shouldFail) {
      throw new Error('Mock: Sprite sheet generation failed');
    }

    return {
      url: `https://mock-cdn.fieldview.test/sprites/${recordingId}.jpg`,
      thumbnailsPerRow: 10,
      thumbnailWidth: 128,
      thumbnailHeight: 72,
      totalThumbnails: 100,
    };
  }

  // ========================================
  // IDVRService Implementation
  // ========================================

  getProviderName(): string {
    return 'mock';
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }

  // ========================================
  // Test Helpers (Public for Testing)
  // ========================================

  /**
   * Reset all mock data
   */
  _reset(): void {
    this.recordings.clear();
    this.clips.clear();
    this.shouldFail = false;
  }

  /**
   * Get all mock recordings
   */
  _getRecordings(): RecordingSession[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Get all mock clips
   */
  _getClips(): ClipCreationResult[] {
    return Array.from(this.clips.values());
  }

  /**
   * Force next operation to fail (for testing error handling)
   */
  _setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Manually set clip status (for testing async workflows)
   */
  _setClipStatus(clipId: string, status: 'pending' | 'ready' | 'failed'): void {
    const clip = this.clips.get(clipId);
    if (clip) {
      clip.status = status;
      this.clips.set(clipId, clip);
    }
  }
}

