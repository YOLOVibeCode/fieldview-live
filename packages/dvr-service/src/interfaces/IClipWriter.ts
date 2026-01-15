/**
 * IClipWriter Interface
 * 
 * Modify/delete clips
 * ISP: Segregated write operations only
 */

export interface IClipWriter {
  /**
   * Delete a clip permanently
   * @param clipId - Clip to delete
   */
  deleteClip(clipId: string): Promise<void>;

  /**
   * Update clip expiration
   * @param clipId - Clip identifier
   * @param expiresAt - New expiration date
   */
  updateExpiration(clipId: string, expiresAt: Date): Promise<void>;

  /**
   * Make clip public/private
   * @param clipId - Clip identifier
   * @param isPublic - Public visibility
   */
  setPublicAccess(clipId: string, isPublic: boolean): Promise<void>;
}

