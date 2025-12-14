/**
 * Telemetry Service Implementation
 * 
 * Implements ITelemetryWriter.
 * Handles telemetry submission and session end with aggregation.
 */

import { NotFoundError } from '../lib/errors';
import type { IPlaybackSessionReader, IPlaybackSessionWriter } from '../repositories/IPlaybackSessionRepository';
import type { ITelemetryWriter, TelemetryEvent, TelemetrySummary } from './ITelemetryService';

export class TelemetryService implements ITelemetryWriter {
  constructor(
    private playbackSessionReader: IPlaybackSessionReader,
    private playbackSessionWriter: IPlaybackSessionWriter
  ) {}

  async submitTelemetry(sessionId: string, events: TelemetryEvent[]): Promise<void> {
    // Verify session exists
    const session = await this.playbackSessionReader.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Playback session not found');
    }

    // For now, telemetry events are logged/stored in the session
    // In production, you might want to store individual events in a separate table
    // For MVP, we'll aggregate on session end
    // This method validates the session exists and events are valid
    if (!Array.isArray(events) || events.length === 0) {
      return; // No events to process
    }

    // Validate events
    for (const event of events) {
      if (!event.type || !event.timestamp) {
        throw new Error('Invalid telemetry event: missing type or timestamp');
      }
    }

    // Events are accepted and will be aggregated on session end
    // In a production system, you might store these events in a separate table
    // or append to a JSON array in the session record
  }

  async endSession(sessionId: string, summary: TelemetrySummary): Promise<import('@prisma/client').PlaybackSession> {
    // Verify session exists
    const session = await this.playbackSessionReader.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Playback session not found');
    }

    // Validate summary
    if (summary.totalWatchMs < 0 || summary.totalBufferMs < 0) {
      throw new Error('Invalid telemetry summary: negative values');
    }

    if (summary.totalBufferMs > summary.totalWatchMs) {
      throw new Error('Invalid telemetry summary: buffer time exceeds watch time');
    }

    // Update session with telemetry summary
    const updatedSession = await this.playbackSessionWriter.update(sessionId, {
      endedAt: new Date(),
      state: 'ended',
      totalWatchMs: summary.totalWatchMs,
      totalBufferMs: summary.totalBufferMs,
      bufferEvents: summary.bufferEvents,
      fatalErrors: summary.fatalErrors,
      startupLatencyMs: summary.startupLatencyMs ?? null,
    });

    return updatedSession;
  }

  /**
   * Aggregate telemetry from events
   * 
   * Helper method to calculate telemetry summary from events.
   */
  static aggregateTelemetry(events: TelemetryEvent[], sessionStartTime: Date): TelemetrySummary {
    let totalWatchMs = 0;
    let totalBufferMs = 0;
    let bufferEvents = 0;
    let fatalErrors = 0;
    let startupLatencyMs: number | undefined;
    let streamDownMs = 0;

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let lastPlayTime: number | null = null;
    let isBuffering = false;
    let bufferStartTime: number | null = null;

    for (const event of sortedEvents) {
      const eventTime = event.timestamp;

      switch (event.type) {
        case 'play':
          if (lastPlayTime === null) {
            // First play event - calculate startup latency
            startupLatencyMs = eventTime - sessionStartTime.getTime();
            lastPlayTime = eventTime;
          } else {
            // Resume from pause/buffer
            if (isBuffering && bufferStartTime !== null) {
              const bufferDuration = eventTime - bufferStartTime;
              totalBufferMs += bufferDuration;
              bufferEvents++;
              isBuffering = false;
              bufferStartTime = null;
            }
            lastPlayTime = eventTime;
          }
          break;

        case 'buffer':
          if (!isBuffering && lastPlayTime !== null) {
            // Start buffering
            isBuffering = true;
            bufferStartTime = eventTime;
          }
          // If duration is provided, use it directly
          if (event.duration) {
            totalBufferMs += event.duration;
            bufferEvents++;
            isBuffering = false;
            bufferStartTime = null;
          }
          break;

        case 'pause':
          if (lastPlayTime !== null) {
            // Calculate watch time up to pause
            totalWatchMs += eventTime - lastPlayTime;
            lastPlayTime = null;
          }
          break;

        case 'error':
          if (event.errorCode === 'fatal' || event.errorCode?.startsWith('fatal_')) {
            fatalErrors++;
          }
          // If error indicates stream down, track downtime
          if (event.errorCode === 'stream_unavailable' || event.errorCode === 'stream_down') {
            if (event.duration) {
              streamDownMs += event.duration;
            }
          }
          break;

        case 'seek':
        case 'quality_change':
          // These don't affect watch/buffer time directly
          break;
      }
    }

    // If session ended while buffering, add final buffer time
    if (isBuffering && bufferStartTime !== null && sortedEvents.length > 0) {
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      if (lastEvent) {
        const bufferDuration = lastEvent.timestamp - bufferStartTime;
        totalBufferMs += bufferDuration;
        bufferEvents++;
      }
    }

    // Calculate final watch time
    if (lastPlayTime !== null && sortedEvents.length > 0) {
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      if (lastEvent) {
        totalWatchMs += lastEvent.timestamp - lastPlayTime;
      }
    }

    return {
      totalWatchMs: Math.round(totalWatchMs),
      totalBufferMs: Math.round(totalBufferMs),
      bufferEvents,
      fatalErrors,
      startupLatencyMs: startupLatencyMs ? Math.round(startupLatencyMs) : undefined,
      streamDownMs: Math.round(streamDownMs),
    };
  }
}
