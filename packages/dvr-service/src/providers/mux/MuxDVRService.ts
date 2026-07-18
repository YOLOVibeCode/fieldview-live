/**
 * MuxDVRService
 * 
 * Mux Video implementation of DVR service
 * Uses Mux Live Streams API and Assets API
 * 
 * Docs: https://docs.mux.com/api-reference
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

export interface MuxConfig {
  tokenId: string;
  tokenSecret: string;
  baseUrl?: string;
}

export class MuxDVRService implements IDVRService {
  private tokenId: string;
  private tokenSecret: string;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: MuxConfig) {
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    this.baseUrl = config.baseUrl || 'https://api.mux.com';

    // Create Basic Auth header
    const credentials = Buffer.from(`${this.tokenId}:${this.tokenSecret}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  // ========================================
  // IStreamRecorder Implementation
  // ========================================

  async startRecording(
    streamKey: string,
    options: RecordingOptions
  ): Promise<RecordingSession> {
    try {
      const response = await this.request('POST', '/video/v1/live-streams', {
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
        },
        reconnect_window: options.dvrWindowMinutes
          ? options.dvrWindowMinutes * 60
          : 600,
        reduced_latency: false, // Standard latency for DVR
      });

      return {
        id: response.data.id,
        streamKey,
        startedAt: new Date(),
        status: 'recording',
        providerMetadata: {
          streamKey: response.data.stream_key,
          playbackIds: response.data.playback_ids,
          assetId: response.data.asset_id,
        },
      };
    } catch (error) {
      throw new Error(`Mux: Failed to start recording - ${this.getErrorMessage(error)}`);
    }
  }

  async stopRecording(sessionId: string): Promise<void> {
    try {
      // Mux auto-creates asset when stream ends
      // We just need to disable the live stream
      await this.request('PUT', `/video/v1/live-streams/${sessionId}`, {
        reconnect_window: 0, // Disable reconnection
      });
    } catch (error) {
      throw new Error(`Mux: Failed to stop recording - ${this.getErrorMessage(error)}`);
    }
  }

  async getRecordingStatus(sessionId: string): Promise<RecordingStatus> {
    try {
      const response = await this.request('GET', `/video/v1/live-streams/${sessionId}`);

      const isActive = response.data.status === 'active';
      const duration = response.data.max_continuous_duration || 0;

      return {
        isRecording: isActive,
        durationSeconds: duration,
        error: response.data.status === 'errored' ? 'Stream error' : undefined,
      };
    } catch (error) {
      throw new Error(`Mux: Failed to get recording status - ${this.getErrorMessage(error)}`);
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
      // First, get the live stream to find the asset
      const liveStream = await this.request('GET', `/video/v1/live-streams/${recordingId}`);
      
      if (!liveStream.data.asset_id) {
        throw new Error('Recording has no associated asset yet');
      }

      // Get the asset to get playback ID
      const asset = await this.request('GET', `/video/v1/assets/${liveStream.data.asset_id}`);
      
      if (!asset.data.playback_ids || asset.data.playback_ids.length === 0) {
        throw new Error('Asset has no playback IDs');
      }

      const playbackId = asset.data.playback_ids[0].id;

      // Create a new asset from the clip timerange
      const clipResponse = await this.request('POST', '/video/v1/assets', {
        input: [
          {
            url: `https://stream.mux.com/${playbackId}.m3u8`,
            start_time: timeRange.startSeconds,
            end_time: timeRange.endSeconds,
          },
        ],
        playback_policy: ['public'],
        mp4_support: options?.format === 'mp4' ? 'standard' : undefined,
      });

      return {
        clipId: clipResponse.data.id,
        status: 'pending', // Mux processes clips asynchronously
        estimatedReadyAt: new Date(Date.now() + 15000), // ~15 seconds
        providerMetadata: {
          assetId: clipResponse.data.id,
          status: clipResponse.data.status,
        },
      };
    } catch (error) {
      throw new Error(`Mux: Failed to create clip - ${this.getErrorMessage(error)}`);
    }
  }

  async getClipStatus(clipId: string): Promise<ClipStatus> {
    try {
      const response = await this.request('GET', `/video/v1/assets/${clipId}`);
      const asset = response.data;

      const status = this.mapMuxStatus(asset.status);
      const playbackUrl = asset.playback_ids && asset.playback_ids.length > 0
        ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`
        : undefined;

      return {
        clipId,
        status,
        playbackUrl,
        thumbnailUrl: asset.playback_ids?.[0]?.id
          ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg?time=0`
          : undefined,
        durationSeconds: asset.duration,
        sizeBytes: asset.max_stored_resolution ? this.estimateSize(asset.duration, asset.max_stored_resolution) : undefined,
        error: asset.errors?.messages?.[0],
      };
    } catch (error) {
      throw new Error(`Mux: Failed to get clip status - ${this.getErrorMessage(error)}`);
    }
  }

  async cancelClipGeneration(clipId: string): Promise<void> {
    try {
      // Mux doesn't have a cancel endpoint, so we delete the asset
      await this.deleteClip(clipId);
    } catch (error) {
      throw new Error(`Mux: Failed to cancel clip - ${this.getErrorMessage(error)}`);
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
      const response = await this.request('GET', `/video/v1/assets/${clipId}`);
      const asset = response.data;

      if (!asset.playback_ids || asset.playback_ids.length === 0) {
        throw new Error('Clip has no playback IDs');
      }

      const playbackId = asset.playback_ids[0].id;
      let url = `https://stream.mux.com/${playbackId}.m3u8`;

      // Mux doesn't support signed URLs natively, but can use tokens for private videos
      // For now, just return the public URL
      
      return url;
    } catch (error) {
      throw new Error(`Mux: Failed to get playback URL - ${this.getErrorMessage(error)}`);
    }
  }

  async getClipMetadata(clipId: string): Promise<ClipMetadata> {
    try {
      const response = await this.request('GET', `/video/v1/assets/${clipId}`);
      const asset = response.data;

      if (!asset.playback_ids || asset.playback_ids.length === 0) {
        throw new Error('Clip has no playback IDs');
      }

      return {
        clipId,
        durationSeconds: asset.duration || 0,
        sizeBytes: this.estimateSize(asset.duration, asset.max_stored_resolution),
        createdAt: new Date(asset.created_at),
        playbackUrl: `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`,
        thumbnailUrl: `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg?time=0`,
        format: asset.mp4_support === 'standard' ? 'mp4' : 'hls',
        quality: asset.max_stored_resolution || 'high',
      };
    } catch (error) {
      throw new Error(`Mux: Failed to get clip metadata - ${this.getErrorMessage(error)}`);
    }
  }

  async clipExists(clipId: string): Promise<boolean> {
    try {
      await this.request('GET', `/video/v1/assets/${clipId}`);
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
      await this.request('DELETE', `/video/v1/assets/${clipId}`);
    } catch (error) {
      throw new Error(`Mux: Failed to delete clip - ${this.getErrorMessage(error)}`);
    }
  }

  async updateExpiration(clipId: string, expiresAt: Date): Promise<void> {
    // Mux doesn't support expiration dates directly
    // This would need to be handled at application level
    // For now, just store in metadata
    console.warn('Mux: Expiration must be handled at application level');
  }

  async setPublicAccess(clipId: string, isPublic: boolean): Promise<void> {
    try {
      await this.request('PUT', `/video/v1/assets/${clipId}`, {
        playback_policy: isPublic ? ['public'] : ['signed'],
      });
    } catch (error) {
      throw new Error(`Mux: Failed to set public access - ${this.getErrorMessage(error)}`);
    }
  }

  // ========================================
  // IThumbnailGenerator Implementation
  // ========================================

  async generateThumbnail(
    recordingId: string,
    timestampSeconds: number
  ): Promise<ThumbnailResult> {
    try {
      // Get the asset/playback ID
      const response = await this.request('GET', `/video/v1/live-streams/${recordingId}`);
      
      if (!response.data.asset_id) {
        throw new Error('Recording has no associated asset');
      }

      const asset = await this.request('GET', `/video/v1/assets/${response.data.asset_id}`);
      
      if (!asset.data.playback_ids || asset.data.playback_ids.length === 0) {
        throw new Error('Asset has no playback IDs');
      }

      const playbackId = asset.data.playback_ids[0].id;

      // Mux auto-generates thumbnails
      return {
        url: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timestampSeconds}`,
        width: 1920,
        height: 1080,
        format: 'jpg',
      };
    } catch (error) {
      throw new Error(`Mux: Failed to generate thumbnail - ${this.getErrorMessage(error)}`);
    }
  }

  async generateSpriteSheet(
    recordingId: string,
    intervalSeconds: number
  ): Promise<SpriteSheetResult> {
    try {
      // Get the asset/playback ID
      const response = await this.request('GET', `/video/v1/live-streams/${recordingId}`);
      
      if (!response.data.asset_id) {
        throw new Error('Recording has no associated asset');
      }

      const asset = await this.request('GET', `/video/v1/assets/${response.data.asset_id}`);
      
      if (!asset.data.playback_ids || asset.data.playback_ids.length === 0) {
        throw new Error('Asset has no playback IDs');
      }

      const playbackId = asset.data.playback_ids[0].id;

      // Mux storyboards API
      return {
        url: `https://image.mux.com/${playbackId}/storyboard.jpg`,
        thumbnailsPerRow: 10,
        thumbnailWidth: 192,
        thumbnailHeight: 108,
        totalThumbnails: Math.floor((asset.data.duration || 0) / intervalSeconds),
      };
    } catch (error) {
      throw new Error(`Mux: Failed to generate sprite sheet - ${this.getErrorMessage(error)}`);
    }
  }

  // ========================================
  // IDVRService Implementation
  // ========================================

  getProviderName(): string {
    return 'mux';
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check: list live streams (with limit 1)
      await this.request('GET', '/video/v1/live-streams?limit=1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  private mapMuxStatus(muxStatus: string): 'pending' | 'ready' | 'failed' {
    switch (muxStatus) {
      case 'ready':
        return 'ready';
      case 'preparing':
      case 'waiting':
        return 'pending';
      case 'errored':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private estimateSize(durationSeconds: number, resolution: string): number {
    // Rough estimate based on duration and resolution
    const bitratesKbps: Record<string, number> = {
      '1080p': 5000,
      '720p': 2500,
      '480p': 1000,
      '360p': 500,
    };

    const bitrate = bitratesKbps[resolution] || 2500;
    return (durationSeconds * bitrate * 1000) / 8; // Convert to bytes
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

