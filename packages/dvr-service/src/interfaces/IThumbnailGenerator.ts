/**
 * IThumbnailGenerator Interface
 * 
 * Generate thumbnails from recordings/clips
 * ISP: Segregated thumbnail operations only
 */

export interface IThumbnailGenerator {
  /**
   * Generate thumbnail at specific timestamp
   * @param recordingId - Source recording
   * @param timestampSeconds - When to capture
   */
  generateThumbnail(
    recordingId: string,
    timestampSeconds: number
  ): Promise<ThumbnailResult>;

  /**
   * Generate multiple thumbnails (sprite sheet)
   * @param recordingId - Source recording
   * @param intervalSeconds - Thumbnail every N seconds
   */
  generateSpriteSheet(
    recordingId: string,
    intervalSeconds: number
  ): Promise<SpriteSheetResult>;
}

// Supporting Types
export interface ThumbnailResult {
  url: string;
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'webp';
}

export interface SpriteSheetResult {
  url: string;
  thumbnailsPerRow: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  totalThumbnails: number;
}

