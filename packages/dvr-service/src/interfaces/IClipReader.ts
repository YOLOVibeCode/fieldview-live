/**
 * IClipReader Interface
 * 
 * Read-only access to clips
 * ISP: Segregated read operations only
 */

export interface IClipReader {
  /**
   * Get clip playback URL
   * @param clipId - Clip identifier
   * @param options - Playback options
   */
  getPlaybackUrl(
    clipId: string,
    options?: PlaybackOptions
  ): Promise<string>;

  /**
   * Get clip metadata
   * @param clipId - Clip identifier
   */
  getClipMetadata(clipId: string): Promise<ClipMetadata>;

  /**
   * Check if clip exists
   * @param clipId - Clip identifier
   */
  clipExists(clipId: string): Promise<boolean>;
}

// Supporting Types
export interface PlaybackOptions {
  quality?: 'low' | 'medium' | 'high';
  expiresInSeconds?: number;
  downloadable?: boolean;
}

export interface ClipMetadata {
  clipId: string;
  durationSeconds: number;
  sizeBytes: number;
  createdAt: Date;
  expiresAt?: Date;
  playbackUrl: string;
  thumbnailUrl?: string;
  format: string;
  quality: string;
}

