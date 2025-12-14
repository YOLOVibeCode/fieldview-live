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
import { WatchBootstrapService } from '../services/WatchBootstrapService';

const router = express.Router();

// Lazy initialization
let entitlementServiceInstance: EntitlementService | null = null;
let watchBootstrapServiceInstance: WatchBootstrapService | null = null;

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

// Export for testing
export function setEntitlementService(service: EntitlementService): void {
  entitlementServiceInstance = service;
}

export function setWatchBootstrapService(service: WatchBootstrapService): void {
  watchBootstrapServiceInstance = service;
}

// Session creation schema
const CreateSessionSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
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

export function createWatchRouter(): Router {
  return router;
}
