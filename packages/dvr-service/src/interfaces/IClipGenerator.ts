/**
 * IClipGenerator Interface
 * 
 * Extracts clips from recordings
 * ISP: Segregated clip creation operations only
 */

export interface IClipGenerator {
  /**
   * Create a clip from a recording
   * @param recordingId - Source recording
   * @param timeRange - Start/end timestamps
   * @param options - Clip configuration
   * @returns Clip metadata (may be pending)
   */
  createClip(
    recordingId: string,
    timeRange: TimeRange,
    options?: ClipOptions
  ): Promise<ClipCreationResult>;

  /**
   * Check if clip generation is complete
   * @param clipId - Clip ID to check
   */
  getClipStatus(clipId: string): Promise<ClipStatus>;

  /**
   * Cancel pending clip generation
   * @param clipId - Clip to cancel
   */
  cancelClipGeneration(clipId: string): Promise<void>;
}

// Supporting Types
export interface TimeRange {
  startSeconds: number;
  endSeconds: number;
}

export interface ClipOptions {
  quality?: 'low' | 'medium' | 'high';
  format?: 'mp4' | 'hls' | 'webm';
  generateThumbnail?: boolean;
  thumbnailAtSeconds?: number;
}

export interface ClipCreationResult {
  clipId: string;
  status: 'pending' | 'ready' | 'failed';
  estimatedReadyAt?: Date;
  playbackUrl?: string;
  thumbnailUrl?: string;
  providerMetadata?: any;
}

export interface ClipStatus {
  clipId: string;
  status: 'pending' | 'ready' | 'failed';
  progress?: number;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  error?: string;
}

