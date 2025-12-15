/**
 * Admin Routes
 * 
 * Admin console endpoints for search, purchase timeline, and game audience.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireAdminAuth } from '../middleware/adminAuth';
import { auditLog } from '../middleware/auditLog';
import type { AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { AdminAccountRepository } from '../repositories/implementations/AdminAccountRepository';
import { EntitlementRepository } from '../repositories/implementations/EntitlementRepository';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { PlaybackSessionRepository } from '../repositories/implementations/PlaybackSessionRepository';
import { PurchaseRepository } from '../repositories/implementations/PurchaseRepository';
import { RefundRepository } from '../repositories/implementations/RefundRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { AdminAuthService } from '../services/AdminAuthService';
import { AdminService } from '../services/AdminService';
import { AudienceService } from '../services/AudienceService';

const router = express.Router();

// Lazy initialization
let adminServiceInstance: AdminService | null = null;
let adminAuthServiceInstance: AdminAuthService | null = null;

function getAdminService(): AdminService {
  if (!adminServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const purchaseRepo = new PurchaseRepository(prisma);
    const entitlementRepo = new EntitlementRepository(prisma);
    const playbackSessionRepo = new PlaybackSessionRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    const refundRepo = new RefundRepository(prisma);
    const audienceService = new AudienceService(
      gameRepo,
      purchaseRepo,
      entitlementRepo,
      playbackSessionRepo,
      viewerIdentityRepo
    );
    adminServiceInstance = new AdminService(
      gameRepo,
      purchaseRepo,
      entitlementRepo,
      playbackSessionRepo,
      viewerIdentityRepo,
      refundRepo,
      audienceService
    );
  }
  return adminServiceInstance;
}

function getAdminAuthService(): AdminAuthService {
  if (!adminAuthServiceInstance) {
    const adminAccountRepo = new AdminAccountRepository(prisma);
    adminAuthServiceInstance = new AdminAuthService(adminAccountRepo, adminAccountRepo);
  }
  return adminAuthServiceInstance;
}

// Export for testing
export function setAdminService(service: AdminService): void {
  adminServiceInstance = service;
}

export function setAdminAuthService(service: AdminAuthService): void {
  adminAuthServiceInstance = service;
}

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().optional(),
});

const MfaVerifySchema = z.object({
  token: z.string().length(6),
});

/**
 * POST /api/admin/login
 * 
 * Admin login with MFA support.
 */
router.post('/login', validateRequest({ body: LoginSchema }), (req, res, next) => {
  void (async () => {
    try {
      const adminAuthService = getAdminAuthService();
      const response = await adminAuthService.login(req.body);
      res.json(response);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * POST /api/admin/mfa/setup
 * 
 * Setup MFA for admin account.
 */
router.post('/mfa/setup', requireAdminAuth, (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const adminAccountId = req.adminUserId;
      if (!adminAccountId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const adminAuthService = getAdminAuthService();
      const response = await adminAuthService.setupMfa(adminAccountId);
      res.json(response);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * POST /api/admin/mfa/verify
 * 
 * Verify MFA token and enable MFA.
 */
router.post('/mfa/verify', requireAdminAuth, validateRequest({ body: MfaVerifySchema }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const adminAccountId = req.adminUserId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { token } = req.body;

      if (!adminAccountId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const adminAuthService = getAdminAuthService();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const verified = await adminAuthService.verifyMfa(adminAccountId, token);

      if (!verified) {
        return res.status(401).json({ error: 'Invalid MFA token' });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/admin/search?q=<query>
 * 
 * Global search for viewers, games, and purchases.
 */
router.get('/search', requireAdminAuth, auditLog({ actionType: 'search', targetType: 'search' }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const query = req.query.q as string;
      const adminRole = req.role || 'support_admin';

      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const adminService = getAdminService();
      const results = await adminService.search(query, adminRole);
      res.json(results);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/admin/purchases/:purchaseId
 * 
 * Get purchase timeline with all events.
 */
router.get('/purchases/:purchaseId', requireAdminAuth, auditLog({ actionType: 'view_purchase', targetType: 'purchase' }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const purchaseId = req.params.purchaseId;
      const adminRole = req.role || 'support_admin';

      if (!purchaseId) {
        return res.status(400).json({ error: 'Purchase ID is required' });
      }

      const adminService = getAdminService();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const timeline = await adminService.getPurchaseTimeline(purchaseId, adminRole);
      res.json(timeline);
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/admin/owners/:ownerId/games/:gameId/audience
 * 
 * Get game audience (SuperAdmin sees full emails, SupportAdmin sees masked).
 */
router.get('/owners/:ownerId/games/:gameId/audience', requireAdminAuth, auditLog({ actionType: 'view_audience', targetType: 'game' }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const ownerId = req.params.ownerId;
      const gameId = req.params.gameId;
      const adminRole = req.role || 'support_admin';

      if (!ownerId || !gameId) {
        return res.status(400).json({ error: 'Owner ID and Game ID are required' });
      }

      const adminService = getAdminService();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const audience = await adminService.getGameAudience(gameId, ownerId, adminRole);
      res.json(audience);
    } catch (error) {
      next(error);
    }
  })();
});

export function createAdminRouter(): Router {
  return router;
}
