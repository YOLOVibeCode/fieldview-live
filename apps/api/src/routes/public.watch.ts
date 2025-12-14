/**
 * Public Watch Routes
 * 
 * Handles watch page endpoints (no auth required, token-based).
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { watchRateLimit } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { PlaybackSessionRepository } from '../repositories/implementations/PlaybackSessionRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { StreamSourceRepository } from '../repositories/implementations/StreamSourceRepository';
import { EntitlementService } from '../services/EntitlementService';
import type { TelemetryEvent, TelemetrySummary } from '../services/ITelemetryService';
import { TelemetryService } from '../services/TelemetryService';
import { WatchBootstrapService } from '../services/WatchBootstrapService';

const router = express.Router();

// Lazy initialization
let entitlementServiceInstance: EntitlementService | null = null;
let watchBootstrapServiceInstance: WatchBootstrapService | null = null;
let telemetryServiceInstance: TelemetryService | null = null;

function getEntitlementService(): EntitlementService {
  if (!entitlementServiceInstance) {
    const entitlementRepo = new EntitlementRepository(prisma);
    const playbackSessionRepo = new PlaybackSessionRepository(prisma);
    entitlementServiceInstance = new EntitlementService(entitlementRepo, playbackSessionRepo);
  }
  return entitlementServiceInstance;
}

function getWatchBootstrapService(): WatchBootstrapService {
  if (!watchBootstrapServiceInstance) {
    const entitlementRepo = new EntitlementRepository(prisma);
    const entitlementService = new EntitlementService(entitlementRepo, new PlaybackSessionRepository(prisma));
    const gameRepo = new GameRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const streamSourceRepo = new StreamSourceRepository(prisma);
    watchBootstrapServiceInstance = new WatchBootstrapService(
      entitlementService,
      gameRepo,
      purchaseRepo,
      streamSourceRepo
    );
  }
  return watchBootstrapServiceInstance;
}

function getTelemetryService(): TelemetryService {
  if (!telemetryServiceInstance) {
    const playbackSessionRepo = new PlaybackSessionRepository(prisma);
    telemetryServiceInstance = new TelemetryService(playbackSessionRepo, playbackSessionRepo);
  }
  return telemetryServiceInstance;
}

// Export for testing
export function setEntitlementService(service: EntitlementService): void {
  entitlementServiceInstance = service;
}

export function setWatchBootstrapService(service: WatchBootstrapService): void {
  watchBootstrapServiceInstance = service;
}

export function setTelemetryService(service: TelemetryService): void {
  telemetryServiceInstance = service;
}

// Session creation schema
const CreateSessionSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

// Telemetry event schema
const TelemetryEventSchema = z.object({
  type: z.enum(['buffer', 'error', 'play', 'pause', 'seek', 'quality_change']),
  timestamp: z.number().int().positive(),
  duration: z.number().int().nonnegative().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Telemetry submission schema
const SubmitTelemetrySchema = z.object({
  events: z.array(TelemetryEventSchema).min(1),
});

// Session end schema
const EndSessionSchema = z.object({
  totalWatchMs: z.number().int().nonnegative(),
  totalBufferMs: z.number().int().nonnegative(),
  bufferEvents: z.number().int().nonnegative(),
  fatalErrors: z.number().int().nonnegative(),
  startupLatencyMs: z.number().int().nonnegative().optional(),
  streamDownMs: z.number().int().nonnegative().optional(),
});

/**
 * GET /api/public/watch/:token
 * 
 * Get watch bootstrap (stream URL, player config).
 */
router.get(
  '/watch/:token',
  watchRateLimit,
  (req, res, next) => {
    void (async () => {
      try {
        const token = req.params.token;
        if (!token) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing token' } });
        }

        const watchBootstrapService = getWatchBootstrapService();
        const bootstrap = await watchBootstrapService.getBootstrap(token);

        res.json(bootstrap);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/public/watch/:token/sessions
 * 
 * Create playback session for entitlement token.
 */
router.post(
  '/watch/:token/sessions',
  watchRateLimit,
  validateRequest({ body: CreateSessionSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const token = req.params.token;
        if (!token) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing token' } });
        }

        const entitlementService = getEntitlementService();

        // Validate token
        const validation = await entitlementService.validateToken(token);
        if (!validation.valid || !validation.entitlement) {
          throw new UnauthorizedError(validation.error || 'Invalid or expired token');
        }

        // Create playback session
        const body = req.body as z.infer<typeof CreateSessionSchema>;
        const session = await entitlementService.createPlaybackSession(
          validation.entitlement.id,
          body.metadata
        );

        res.status(201).json({
          sessionId: session.id,
          startedAt: session.startedAt.toISOString(),
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/public/watch/:token/telemetry
 * 
 * Submit telemetry events for a session.
 */
router.post(
  '/watch/:token/telemetry',
  watchRateLimit,
  validateRequest({ body: SubmitTelemetrySchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const token = req.params.token;
        const sessionId = req.query.sessionId as string;

        if (!token) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing token' } });
        }

        if (!sessionId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing sessionId query parameter' } });
        }

        const entitlementService = getEntitlementService();

        // Validate token
        const validation = await entitlementService.validateToken(token);
        if (!validation.valid || !validation.entitlement) {
          throw new UnauthorizedError(validation.error || 'Invalid or expired token');
        }

        // Submit telemetry
        const body = req.body as z.infer<typeof SubmitTelemetrySchema>;
        const telemetryService = getTelemetryService();
        await telemetryService.submitTelemetry(sessionId, body.events as TelemetryEvent[]);

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/public/watch/:token/sessions/:sessionId/end
 * 
 * End playback session with telemetry summary.
 */
router.post(
  '/watch/:token/sessions/:sessionId/end',
  watchRateLimit,
  validateRequest({ body: EndSessionSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const token = req.params.token;
        const sessionId = req.params.sessionId;

        if (!token) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing token' } });
        }

        if (!sessionId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing sessionId' } });
        }

        const entitlementService = getEntitlementService();

        // Validate token
        const validation = await entitlementService.validateToken(token);
        if (!validation.valid || !validation.entitlement) {
          throw new UnauthorizedError(validation.error || 'Invalid or expired token');
        }

        // End session with telemetry summary
        const body = req.body as z.infer<typeof EndSessionSchema>;
        const telemetryService = getTelemetryService();
        const summary: TelemetrySummary = {
          totalWatchMs: body.totalWatchMs,
          totalBufferMs: body.totalBufferMs,
          bufferEvents: body.bufferEvents,
          fatalErrors: body.fatalErrors,
          startupLatencyMs: body.startupLatencyMs,
          streamDownMs: body.streamDownMs,
        };
        const session = await telemetryService.endSession(sessionId, summary);

        res.json({
          sessionId: session.id,
          endedAt: session.endedAt?.toISOString(),
          totalWatchMs: session.totalWatchMs,
          totalBufferMs: session.totalBufferMs,
          bufferEvents: session.bufferEvents,
          fatalErrors: session.fatalErrors,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createWatchRouter(): Router {
  return router;
}
