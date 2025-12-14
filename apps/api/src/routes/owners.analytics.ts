/**
 * Owner Analytics & Audience Routes
 * 
 * Analytics and audience monitoring endpoints for authenticated owners.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { PlaybackSessionRepository } from '../repositories/implementations/PlaybackSessionRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { AudienceService } from '../services/AudienceService';

const router = express.Router();

// Lazy initialization
let audienceServiceInstance: AudienceService | null = null;

function getAudienceService(): AudienceService {
  if (!audienceServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const playbackSessionRepo = new PlaybackSessionRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    audienceServiceInstance = new AudienceService(
      gameRepo,
      purchaseRepo,
      entitlementRepo,
      playbackSessionRepo,
      viewerIdentityRepo
    );
  }
  return audienceServiceInstance;
}

// Export for testing
export function setAudienceService(service: AudienceService): void {
  audienceServiceInstance = service;
}

/**
 * GET /api/owners/me/analytics
 * 
 * Returns owner analytics (revenue, purchases, conversion rate, etc.)
 */
router.get('/me/analytics', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const ownerAccountId = req.ownerAccountId;
      if (!ownerAccountId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const audienceService = getAudienceService();
      const analytics = await audienceService.getOwnerAnalytics(ownerAccountId);

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/owners/me/games/:gameId/audience
 * 
 * Returns game audience (purchasers and watchers) with masked emails.
 */
router.get('/me/games/:gameId/audience', requireOwnerAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const ownerAccountId = req.ownerAccountId;
      const gameId = req.params.gameId;

      if (!ownerAccountId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!gameId) {
        return res.status(400).json({ error: 'Game ID is required' });
      }

      const audienceService = getAudienceService();
      const audience = await audienceService.getGameAudience(gameId, ownerAccountId, true); // maskEmails = true

      res.json(audience);
    } catch (error) {
      next(error);
    }
  })();
});

export function createOwnersAnalyticsRouter(): Router {
  return router;
}
