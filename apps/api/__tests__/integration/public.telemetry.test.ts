import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { EntitlementService } from '@/services/EntitlementService';
import { TelemetryService } from '@/services/TelemetryService';
import * as watchRoute from '@/routes/public.watch';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';
import type { Entitlement, PlaybackSession } from '@prisma/client';
import type { TelemetryEvent } from '@/services/ITelemetryService';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock Mux client
vi.mock('@/lib/mux', () => ({
  muxClient: {
    video: {
      liveStreams: {
        create: vi.fn(),
      },
    },
  },
}));

describe('Public Telemetry Routes', () => {
  let request: SuperTest<typeof app>;
  let mockEntitlementService: {
    validateToken: ReturnType<typeof vi.fn>;
    createPlaybackSession: ReturnType<typeof vi.fn>;
  };
  let mockTelemetryService: {
    submitTelemetry: ReturnType<typeof vi.fn>;
    endSession: ReturnType<typeof vi.fn>;
  };
  let mockEntitlement: Entitlement;
  let mockSession: PlaybackSession;

  beforeEach(() => {
    vi.clearAllMocks();
    request = agent(app);

    mockEntitlementService = {
      validateToken: vi.fn(),
      createPlaybackSession: vi.fn(),
    };

    mockTelemetryService = {
      submitTelemetry: vi.fn(),
      endSession: vi.fn(),
    };

    mockEntitlement = {
      id: 'entitlement-1',
      tokenId: 'token-123',
      status: 'active',
      validFrom: new Date(Date.now() - 1000),
      validTo: new Date(Date.now() + 3600000),
    } as Entitlement;

    mockSession = {
      id: 'session-1',
      entitlementId: 'entitlement-1',
      startedAt: new Date(),
      state: 'started',
    } as PlaybackSession;

    // Set the mocked services
    watchRoute.setEntitlementService(mockEntitlementService as any);
    watchRoute.setTelemetryService(mockTelemetryService as any);
  });

  describe('POST /api/public/watch/:token/telemetry', () => {
    it('submits telemetry events successfully', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement: mockEntitlement,
      });
      mockTelemetryService.submitTelemetry.mockResolvedValue(undefined);

      const events: TelemetryEvent[] = [
        { type: 'play', timestamp: Date.now() },
        { type: 'buffer', timestamp: Date.now() + 1000, duration: 500 },
      ];

      await request
        .post('/api/public/watch/token-123/telemetry?sessionId=session-1')
        .send({ events })
        .expect(204);

      expect(mockTelemetryService.submitTelemetry).toHaveBeenCalledWith('session-1', events);
    });

    it('returns 400 for missing sessionId', async () => {
      await request
        .post('/api/public/watch/token-123/telemetry')
        .send({ events: [] })
        .expect(400);
    });

    it('returns 401 for invalid token', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const events: TelemetryEvent[] = [
        { type: 'play', timestamp: Date.now() },
      ];

      await request
        .post('/api/public/watch/invalid-token/telemetry?sessionId=session-1')
        .send({ events })
        .expect(401);
    });

    it('validates event structure', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement: mockEntitlement,
      });

      await request
        .post('/api/public/watch/token-123/telemetry?sessionId=session-1')
        .send({
          events: [
            { type: 'play' }, // Missing timestamp
          ],
        })
        .expect(400);
    });
  });

  describe('POST /api/public/watch/:token/sessions/:sessionId/end', () => {
    it('ends session with telemetry summary successfully', async () => {
      const endedSession = {
        ...mockSession,
        endedAt: new Date(),
        state: 'ended',
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
      } as PlaybackSession;

      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement: mockEntitlement,
      });
      mockTelemetryService.endSession.mockResolvedValue(endedSession);

      const summary = {
        totalWatchMs: 60000,
        totalBufferMs: 5000,
        bufferEvents: 3,
        fatalErrors: 0,
        startupLatencyMs: 2000,
      };

      const response = await request
        .post('/api/public/watch/token-123/sessions/session-1/end')
        .send(summary)
        .expect(200);

      expect(response.body.sessionId).toBe('session-1');
      expect(response.body.totalWatchMs).toBe(60000);
      expect(response.body.totalBufferMs).toBe(5000);
      expect(mockTelemetryService.endSession).toHaveBeenCalledWith('session-1', summary);
    });

    it('returns 401 for invalid token', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await request
        .post('/api/public/watch/invalid-token/sessions/session-1/end')
        .send({
          totalWatchMs: 60000,
          totalBufferMs: 5000,
          bufferEvents: 3,
          fatalErrors: 0,
        })
        .expect(401);
    });

    it('validates telemetry summary', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement: mockEntitlement,
      });

      await request
        .post('/api/public/watch/token-123/sessions/session-1/end')
        .send({
          totalWatchMs: -1000, // Invalid: negative
          totalBufferMs: 5000,
          bufferEvents: 3,
          fatalErrors: 0,
        })
        .expect(400);
    });
  });
});
