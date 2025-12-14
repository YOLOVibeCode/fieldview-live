import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryService } from '@/services/TelemetryService';
import { NotFoundError } from '@/lib/errors';
import type { IPlaybackSessionReader, IPlaybackSessionWriter } from '@/repositories/IPlaybackSessionRepository';
import type { PlaybackSession, TelemetryEvent, TelemetrySummary } from '@prisma/client';
import type { TelemetryEvent as ITelemetryEvent } from '@/services/ITelemetryService';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockPlaybackSessionReader: IPlaybackSessionReader;
  let mockPlaybackSessionWriter: IPlaybackSessionWriter;

  beforeEach(() => {
    mockPlaybackSessionReader = {
      getById: vi.fn(),
      listByEntitlementId: vi.fn(),
    };
    mockPlaybackSessionWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new TelemetryService(mockPlaybackSessionReader, mockPlaybackSessionWriter);
  });

  describe('submitTelemetry', () => {
    it('accepts valid telemetry events', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);

      const events: ITelemetryEvent[] = [
        { type: 'play', timestamp: Date.now() },
        { type: 'buffer', timestamp: Date.now() + 1000, duration: 500 },
      ];

      await expect(service.submitTelemetry('session-1', events)).resolves.not.toThrow();
      expect(mockPlaybackSessionReader.getById).toHaveBeenCalledWith('session-1');
    });

    it('throws NotFoundError for non-existent session', async () => {
      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(null);

      await expect(service.submitTelemetry('invalid-session', [])).rejects.toThrow(NotFoundError);
    });

    it('handles empty events array', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);

      await expect(service.submitTelemetry('session-1', [])).resolves.not.toThrow();
    });

    it('validates event structure', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);

      const invalidEvents = [
        { type: 'play' }, // Missing timestamp
      ] as any;

      await expect(service.submitTelemetry('session-1', invalidEvents)).rejects.toThrow(
        'Invalid telemetry event: missing type or timestamp'
      );
    });
  });

  describe('endSession', () => {
    it('ends session with telemetry summary', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      const updatedSession = {
        ...session,
        endedAt: new Date(),
        state: 'ended',
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
        startupLatencyMs: 2000,
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);
      vi.mocked(mockPlaybackSessionWriter.update).mockResolvedValue(updatedSession);

      const summary: TelemetrySummary = {
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
        startupLatencyMs: 2000,
      };

      const result = await service.endSession('session-1', summary);

      expect(result.endedAt).toBeDefined();
      expect(result.state).toBe('ended');
      expect(result.totalWatchMs).toBe(60000);
      expect(result.totalBufferMs).toBe(5000);
      expect(mockPlaybackSessionWriter.update).toHaveBeenCalledWith('session-1', {
        endedAt: expect.any(Date),
        state: 'ended',
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
        startupLatencyMs: 2000,
      });
    });

    it('throws NotFoundError for non-existent session', async () => {
      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(null);

      const summary: TelemetrySummary = {
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
      };

      await expect(service.endSession('invalid-session', summary)).rejects.toThrow(NotFoundError);
    });

    it('validates negative values', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);

      const invalidSummary: TelemetrySummary = {
        totalWatchMs: -1000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
      };

      await expect(service.endSession('session-1', invalidSummary)).rejects.toThrow(
        'Invalid telemetry summary: negative values'
      );
    });

    it('validates buffer time does not exceed watch time', async () => {
      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      vi.mocked(mockPlaybackSessionReader.getById).mockResolvedValue(session);

      const invalidSummary: TelemetrySummary = {
        totalWatchMs: 5000,
        totalBufferMs: 6000, // Buffer exceeds watch time
        bufferEvents: 3,
        fatalErrors: 0,
      };

      await expect(service.endSession('session-1', invalidSummary)).rejects.toThrow(
        'Invalid telemetry summary: buffer time exceeds watch time'
      );
    });
  });

  describe('aggregateTelemetry (static)', () => {
    it('calculates telemetry summary from events', () => {
      const sessionStartTime = new Date('2024-01-01T12:00:00Z');
      const startTime = sessionStartTime.getTime();

      const events: ITelemetryEvent[] = [
        { type: 'play', timestamp: startTime + 2000 }, // Startup latency: 2000ms
        { type: 'buffer', timestamp: startTime + 10000, duration: 5000 }, // Buffer: 5000ms
        { type: 'play', timestamp: startTime + 15000 }, // Resume
        { type: 'pause', timestamp: startTime + 60000 }, // Watch: 45000ms (60000 - 15000)
        { type: 'error', timestamp: startTime + 65000, errorCode: 'fatal_stream_error' }, // Fatal error
      ];

      const summary = TelemetryService.aggregateTelemetry(events, sessionStartTime);

      expect(summary.startupLatencyMs).toBe(2000);
      expect(summary.totalBufferMs).toBe(5000);
      expect(summary.totalWatchMs).toBe(45000);
      expect(summary.bufferEvents).toBe(1);
      expect(summary.fatalErrors).toBe(1);
    });

    it('handles multiple buffer events', () => {
      const sessionStartTime = new Date('2024-01-01T12:00:00Z');
      const startTime = sessionStartTime.getTime();

      const events: ITelemetryEvent[] = [
        { type: 'play', timestamp: startTime },
        { type: 'buffer', timestamp: startTime + 10000, duration: 2000 },
        { type: 'play', timestamp: startTime + 12000 },
        { type: 'buffer', timestamp: startTime + 20000, duration: 3000 },
        { type: 'play', timestamp: startTime + 23000 },
      ];

      const summary = TelemetryService.aggregateTelemetry(events, sessionStartTime);

      expect(summary.totalBufferMs).toBe(5000); // 2000 + 3000
      expect(summary.bufferEvents).toBe(2);
    });

    it('handles stream down errors', () => {
      const sessionStartTime = new Date('2024-01-01T12:00:00Z');
      const startTime = sessionStartTime.getTime();

      const events: ITelemetryEvent[] = [
        { type: 'play', timestamp: startTime },
        {
          type: 'error',
          timestamp: startTime + 10000,
          errorCode: 'stream_down',
          duration: 5000,
        },
      ];

      const summary = TelemetryService.aggregateTelemetry(events, sessionStartTime);

      expect(summary.streamDownMs).toBe(5000);
    });

    it('handles empty events array', () => {
      const sessionStartTime = new Date('2024-01-01T12:00:00Z');
      const summary = TelemetryService.aggregateTelemetry([], sessionStartTime);

      expect(summary.totalWatchMs).toBe(0);
      expect(summary.totalBufferMs).toBe(0);
      expect(summary.bufferEvents).toBe(0);
      expect(summary.fatalErrors).toBe(0);
    });
  });
});
