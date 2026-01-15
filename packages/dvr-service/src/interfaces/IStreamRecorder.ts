/**
 * IStreamRecorder Interface
 * 
 * Manages live stream recording lifecycle
 * ISP: Segregated recording operations only
 */

export interface IStreamRecorder {
  /**
   * Start recording a live stream
   * @param streamKey - Unique stream identifier
   * @param options - Recording configuration
   * @returns Recording session ID
   */
  startRecording(
    streamKey: string,
    options: RecordingOptions
  ): Promise<RecordingSession>;

  /**
   * Stop active recording
   * @param sessionId - Recording session to stop
   */
  stopRecording(sessionId: string): Promise<void>;

  /**
   * Get current recording status
   * @param sessionId - Recording session ID
   */
  getRecordingStatus(sessionId: string): Promise<RecordingStatus>;

  /**
   * Get recording duration (seconds)
   * @param sessionId - Recording session ID
   */
  getRecordingDuration(sessionId: string): Promise<number>;
}

// Supporting Types
export interface RecordingOptions {
  quality?: 'low' | 'medium' | 'high';
  dvr?: boolean;
  dvrWindowMinutes?: number;
  autoDelete?: boolean;
  deleteAfterDays?: number;
}

export interface RecordingSession {
  id: string;
  streamKey: string;
  startedAt: Date;
  status: 'recording' | 'stopped' | 'error';
  providerMetadata?: any;
}

export interface RecordingStatus {
  isRecording: boolean;
  durationSeconds: number;
  sizeBytes?: number;
  error?: string;
}

