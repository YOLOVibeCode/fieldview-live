/**
 * CloudflareDVRService
 * 
 * Cloudflare Stream implementation of DVR service
 * Uses Cloudflare Stream API for live inputs and clips
 * 
 * Docs: https://developers.cloudflare.com/stream/
 */

import {
  IDVRService,
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

export interface CloudflareConfig {
  apiKey: string;
  accountId: string;
  baseUrl?: string;
}

export class CloudflareDVRService implements IDVRService {
  private apiKey: string;
  private accountId: string;
  private baseUrl: string;

  constructor(config: CloudflareConfig) {
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl || 'https://api.cloudflare.com/client/v4';
  }

  // ========================================
  // IStreamRecorder Implementation
  // ========================================

  async startRecording(
    streamKey: string,
    options: RecordingOptions
  ): Promise<RecordingSession> {
    try {
      const response = await this.request('POST', '/stream/live_inputs', {
        meta: { name: streamKey },
        recording: {
          mode: options.dvr ? 'automatic' : 'off',
          timeoutSeconds: options.dvrWindowMinutes
            ? options.dvrWindowMinutes * 60
            : 600,
          requireSignedURLs: false,
        },
      });

      return {
        id: response.uid,
        streamKey,
        startedAt: new Date(),
        status: 'recording',
        providerMetadata: {
          rtmps: response.rtmps,
          recording: response.recording,
        },
      };
    } catch (error) {
      throw new Error(`Cloudflare: Failed to start recording - ${this.getErrorMessage(error)}`);
    }
  }

  async stopRecording(sessionId: string): Promise<void> {
    try {
      // Delete live input to stop recording
      await this.request('DELETE', `/stream/live_inputs/${sessionId}`);
    } catch (error) {
      throw new Error(`Cloudflare: Failed to stop recording - ${this.getErrorMessage(error)}`);
    }
  }

  async getRecordingStatus(sessionId: string): Promise<RecordingStatus> {
    try {
      const response = await this.request('GET', `/stream/live_inputs/${sessionId}`);

      const isConnected = response.status?.state === 'connected';
      const duration = Math.floor(response.duration || 0);

      return {
        isRecording: isConnected,
        durationSeconds: duration,
      };
    } catch (error) {
      throw new Error(`Cloudflare: Failed to get recording status - ${this.getErrorMessage(error)}`);
    }
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
    try {
      const response = await this.request('POST', '/stream/clip', {
        uid: recordingId,
        startTimeSeconds: timeRange.startSeconds,
        endTimeSeconds: timeRange.endSeconds,
        creator: 'fieldview-dvr',
        maxDurationSeconds: timeRange.endSeconds - timeRange.startSeconds,
      });

      return {
        clipId: response.uid,
        status: 'pending', // Cloudflare clips are async
        estimatedReadyAt: new Date(Date.now() + 5000), // ~5 seconds
        providerMetadata: {
          readyToStream: response.readyToStream,
        },
      };
    } catch (error) {
      throw new Error(`Cloudflare: Failed to create clip - ${this.getErrorMessage(error)}`);
    }
  }

  async getClipStatus(clipId: string): Promise<ClipStatus> {
    try {
      const response = await this.request('GET', `/stream/${clipId}`);

      const status = response.readyToStream ? 'ready' : 'pending';
      const playbackUrl = response.readyToStream
        ? `https://customer-${this.accountId}.cloudflarestream.com/${clipId}/manifest/video.m3u8`
        : undefined;

      return {
        clipId,
        status,
        playbackUrl,
        thumbnailUrl: response.thumbnail,
        durationSeconds: response.duration,
      };
    } catch (error) {
      throw new Error(`Cloudflare: Failed to get clip status - ${this.getErrorMessage(error)}`);
    }
  }

  async cancelClipGeneration(clipId: string): Promise<void> {
    try {
      // Cloudflare doesn't have cancel, so we delete
      await this.deleteClip(clipId);
    } catch (error) {
      throw new Error(`Cloudflare: Failed to cancel clip - ${this.getErrorMessage(error)}`);
    }
  }

  // ========================================
  // IClipReader Implementation
  // ========================================

  async getPlaybackUrl(
    clipId: string,
    options?: PlaybackOptions
  ): Promise<string> {
    try {
      const response = await this.request('GET', `/stream/${clipId}`);

      if (!response.readyToStream) {
        throw new Error('Clip not ready for playback yet');
      }

      let url = `https://customer-${this.accountId}.cloudflarestream.com/${clipId}/manifest/video.m3u8`;

      // Cloudflare supports signed URLs if needed
      if (options?.expiresInSeconds) {
        // For signed URLs, would need to generate token
        // Simplified here
        url += `?exp=${Date.now() + options.expiresInSeconds * 1000}`;
      }

      return url;
    } catch (error) {
      throw new Error(`Cloudflare: Failed to get playback URL - ${this.getErrorMessage(error)}`);
    }
  }

  async getClipMetadata(clipId: string): Promise<ClipMetadata> {
    try {
      const response = await this.request('GET', `/stream/${clipId}`);

      return {
        clipId,
        durationSeconds: response.duration || 0,
        sizeBytes: response.size || 0,
        createdAt: new Date(response.created),
        playbackUrl: `https://customer-${this.accountId}.cloudflarestream.com/${clipId}/manifest/video.m3u8`,
        thumbnailUrl: response.thumbnail,
        format: 'hls',
        quality: response.meta?.quality || 'high',
      };
    } catch (error) {
      throw new Error(`Cloudflare: Failed to get clip metadata - ${this.getErrorMessage(error)}`);
    }
  }

  async clipExists(clipId: string): Promise<boolean> {
    try {
      await this.request('GET', `/stream/${clipId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ========================================
  // IClipWriter Implementation
  // ========================================

  async deleteClip(clipId: string): Promise<void> {
    try {
      await this.request('DELETE', `/stream/${clipId}`);
    } catch (error) {
      throw new Error(`Cloudflare: Failed to delete clip - ${this.getErrorMessage(error)}`);
    }
  }

  async updateExpiration(clipId: string, expiresAt: Date): Promise<void> {
    // Cloudflare doesn't have built-in expiration
    // This would need to be handled at application level
    console.warn('Cloudflare: Expiration must be handled at application level');
  }

  async setPublicAccess(clipId: string, isPublic: boolean): Promise<void> {
    try {
      await this.request('POST', `/stream/${clipId}`, {
        requireSignedURLs: !isPublic,
      });
    } catch (error) {
      throw new Error(`Cloudflare: Failed to set public access - ${this.getErrorMessage(error)}`);
    }
  }

  // ========================================
  // IThumbnailGenerator Implementation
  // ========================================

  async generateThumbnail(
    recordingId: string,
    timestampSeconds: number
  ): Promise<ThumbnailResult> {
    // Cloudflare auto-generates thumbnails
    return {
      url: `https://customer-${this.accountId}.cloudflarestream.com/${recordingId}/thumbnails/thumbnail.jpg?time=${timestampSeconds}s`,
      width: 1920,
      height: 1080,
      format: 'jpg',
    };
  }

  async generateSpriteSheet(
    recordingId: string,
    intervalSeconds: number
  ): Promise<SpriteSheetResult> {
    // Cloudflare thumbnails API
    return {
      url: `https://customer-${this.accountId}.cloudflarestream.com/${recordingId}/thumbnails/thumbnail.vtt`,
      thumbnailsPerRow: 10,
      thumbnailWidth: 192,
      thumbnailHeight: 108,
      totalThumbnails: 100, // Estimated
    };
  }

  // ========================================
  // IDVRService Implementation
  // ========================================

  getProviderName(): string {
    return 'cloudflare';
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check: list live inputs with limit 1
      await this.request('GET', '/stream/live_inputs?limit=1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}/accounts/${this.accountId}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `HTTP ${response.status}: ${errorBody}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors.map((e: any) => e.message).join(', ');
        }
      } catch {
        // Keep original error message
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.success) {
      const errorMessage = data.errors
        ? data.errors.map((e: any) => e.message).join(', ')
        : 'Unknown error';
      throw new Error(errorMessage);
    }

    return data.result;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

