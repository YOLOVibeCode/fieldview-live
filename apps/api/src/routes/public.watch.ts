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
import { PlaybackSessionRepository } from '../repositories/implementations/PlaybackSessionRepository';
import { EntitlementService } from '../services/EntitlementService';

const router = express.Router();

// Lazy initialization
let entitlementServiceInstance: EntitlementService | null = null;

function getEntitlementService(): EntitlementService {
  if (!entitlementServiceInstance) {
    const entitlementRepo = new EntitlementRepository(prisma);
    const playbackSessionRepo = new PlaybackSessionRepository(prisma);
    entitlementServiceInstance = new EntitlementService(entitlementRepo, playbackSessionRepo);
  }
  return entitlementServiceInstance;
}

// Export for testing
export function setEntitlementService(service: EntitlementService): void {
  entitlementServiceInstance = service;
}

// Session creation schema
const CreateSessionSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

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
