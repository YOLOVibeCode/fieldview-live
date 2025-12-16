import type { TelemetryEvent, WatchEndSessionRequest } from '@/lib/api-client';

interface WatchTelemetryState {
  startedAtMs: number;
  firstPlayAtMs?: number;
  lastPlayAtMs?: number;
  bufferingSinceMs?: number;
  totalWatchMs: number;
  totalBufferMs: number;
  bufferEvents: number;
  fatalErrors: number;
  streamDownMs?: number;
  events: TelemetryEvent[];
}

export interface WatchTelemetry {
  onPlay(nowMs?: number): void;
  onPause(nowMs?: number): void;
  onBufferStart(nowMs?: number): void;
  onBufferEnd(nowMs?: number): void;
  onFatalError(message?: string, nowMs?: number): void;
  onSeek(nowMs?: number): void;
  onQualityChange(nowMs?: number, metadata?: Record<string, unknown>): void;
  drainEvents(max?: number): TelemetryEvent[];
  hasEvents(): boolean;
  buildEndSessionRequest(nowMs?: number): WatchEndSessionRequest;
}

function now(): number {
  return Date.now();
}

function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

export function createWatchTelemetry(startedAtMs: number = now()): WatchTelemetry {
  const state: WatchTelemetryState = {
    startedAtMs,
    totalWatchMs: 0,
    totalBufferMs: 0,
    bufferEvents: 0,
    fatalErrors: 0,
    events: [],
  };

  function record(event: TelemetryEvent): void {
    state.events.push(event);
  }

  function finalizeWatchIfPlaying(nowMs: number): void {
    if (state.lastPlayAtMs !== undefined) {
      state.totalWatchMs += clampNonNegative(nowMs - state.lastPlayAtMs);
      state.lastPlayAtMs = undefined;
    }
  }

  function finalizeBufferIfBuffering(nowMs: number): void {
    if (state.bufferingSinceMs !== undefined) {
      state.totalBufferMs += clampNonNegative(nowMs - state.bufferingSinceMs);
      state.bufferingSinceMs = undefined;
    }
  }

  return {
    onPlay(nowMs: number = now()) {
      if (state.firstPlayAtMs === undefined) {
        state.firstPlayAtMs = nowMs;
      }
      // Ending buffering if any
      if (state.bufferingSinceMs !== undefined) {
        finalizeBufferIfBuffering(nowMs);
      }
      // Start (or resume) watch interval
      if (state.lastPlayAtMs === undefined) {
        state.lastPlayAtMs = nowMs;
      }
      record({ type: 'play', timestamp: nowMs });
    },

    onPause(nowMs: number = now()) {
      // End watch interval
      finalizeWatchIfPlaying(nowMs);
      // End buffering if any
      if (state.bufferingSinceMs !== undefined) {
        finalizeBufferIfBuffering(nowMs);
      }
      record({ type: 'pause', timestamp: nowMs });
    },

    onBufferStart(nowMs: number = now()) {
      if (state.bufferingSinceMs === undefined) {
        state.bufferingSinceMs = nowMs;
        state.bufferEvents += 1;
        record({ type: 'buffer', timestamp: nowMs });
      }
    },

    onBufferEnd(nowMs: number = now()) {
      if (state.bufferingSinceMs !== undefined) {
        finalizeBufferIfBuffering(nowMs);
      }
    },

    onFatalError(message?: string, nowMs: number = now()) {
      state.fatalErrors += 1;
      record({
        type: 'error',
        timestamp: nowMs,
        errorCode: 'fatal',
        errorMessage: message,
      });
    },

    onSeek(nowMs: number = now()) {
      record({ type: 'seek', timestamp: nowMs });
    },

    onQualityChange(nowMs: number = now(), metadata?: Record<string, unknown>) {
      record({ type: 'quality_change', timestamp: nowMs, metadata });
    },

    drainEvents(max: number = 50) {
      if (state.events.length === 0) return [];
      return state.events.splice(0, max);
    },

    hasEvents() {
      return state.events.length > 0;
    },

    buildEndSessionRequest(nowMs: number = now()): WatchEndSessionRequest {
      // Ensure we count any in-flight intervals
      finalizeWatchIfPlaying(nowMs);
      finalizeBufferIfBuffering(nowMs);

      const startupLatencyMs =
        state.firstPlayAtMs !== undefined ? clampNonNegative(state.firstPlayAtMs - state.startedAtMs) : undefined;

      return {
        totalWatchMs: Math.round(clampNonNegative(state.totalWatchMs)),
        totalBufferMs: Math.round(clampNonNegative(state.totalBufferMs)),
        bufferEvents: Math.round(clampNonNegative(state.bufferEvents)),
        fatalErrors: Math.round(clampNonNegative(state.fatalErrors)),
        startupLatencyMs: startupLatencyMs !== undefined ? Math.round(startupLatencyMs) : undefined,
        streamDownMs: state.streamDownMs,
      };
    },
  };
}


