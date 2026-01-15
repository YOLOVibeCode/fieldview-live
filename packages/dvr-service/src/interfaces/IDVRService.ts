/**
 * IDVRService Interface
 * 
 * Composite interface implementing all DVR capabilities
 * Combines all segregated interfaces for convenience
 */

import { IStreamRecorder } from './IStreamRecorder';
import { IClipGenerator } from './IClipGenerator';
import { IClipReader } from './IClipReader';
import { IClipWriter } from './IClipWriter';
import { IThumbnailGenerator } from './IThumbnailGenerator';

export interface IDVRService
  extends IStreamRecorder,
          IClipGenerator,
          IClipReader,
          IClipWriter,
          IThumbnailGenerator {
  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

