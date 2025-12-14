/**
 * Telemetry Service Interfaces (ISP)
 * 
 * Segregated interfaces for telemetry operations.
 */

import type { PlaybackSession } from '@prisma/client';

export interface TelemetryEvent {
  type: 'buffer' | 'error' | 'play' | 'pause' | 'seek' | 'quality_change';
  timestamp: number; // Unix timestamp in milliseconds
  duration?: number; // Duration in milliseconds (for buffer events)
  errorCode?: string; // For error events
  errorMessage?: string; // For error events
  metadata?: Record<string, unknown>; // Additional event data
}

export interface TelemetrySummary {
  totalWatchMs: number;
  totalBufferMs: number;
  bufferEvents: number;
  fatalErrors: number;
  startupLatencyMs?: number;
  streamDownMs?: number;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on writing telemetry data.
 */
export interface ITelemetryWriter {
  submitTelemetry(sessionId: string, events: TelemetryEvent[]): Promise<void>;
  endSession(sessionId: string, summary: TelemetrySummary): Promise<PlaybackSession>;
}
