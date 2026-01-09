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

/**
 * GET /api/admin/purchases
 * 
 * List purchases with payout breakdown (gross, fees, net, recipient).
 * Supports filtering by date range, recipient type, org, and status.
 */
const ListPurchasesQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  recipientType: z.enum(['personal', 'organization']).optional(),
  organizationId: z.string().uuid().optional(),
  orgShortName: z.string().optional(),
  status: z.enum(['created', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/purchases', requireAdminAuth, auditLog({ actionType: 'view_purchases', targetType: 'purchase' }), validateRequest({ query: ListPurchasesQuerySchema }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const query = req.query as unknown as z.infer<typeof ListPurchasesQuerySchema>;
      
      // Build where clause
      const where: any = {};
      
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = query.startDate;
        if (query.endDate) where.createdAt.lte = query.endDate;
      }
      
      if (query.recipientType) {
        where.recipientType = query.recipientType;
      }
      
      if (query.organizationId) {
        where.recipientOrganizationId = query.organizationId;
      }
      
      if (query.orgShortName) {
        // Need to join with Organization to filter by shortName
        const org = await prisma.organization.findUnique({ where: { shortName: query.orgShortName } });
        if (org) {
          where.recipientOrganizationId = org.id;
        } else {
          // Return empty result if org not found
          return res.json({ purchases: [], total: 0 });
        }
      }
      
      if (query.status) {
        where.status = query.status;
      }
      
      // Get purchases with related data
      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where,
          include: {
            game: {
              include: {
                ownerAccount: true,
              },
            },
            channel: {
              include: {
                organization: true,
              },
            },
            event: {
              include: {
                organization: true,
              },
            },
            viewer: true,
          },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.purchase.count({ where }),
      ]);
      
      // Format response with breakdown
      const formatted = purchases.map((p: any) => {
        // Determine recipient identity
        let recipientIdentity: string | null = null;
        if (p.recipientType === 'personal' && p.game?.ownerAccount) {
          recipientIdentity = p.game.ownerAccount.contactEmail;
        } else if (p.recipientType === 'organization') {
          if (p.channel?.organization) {
            recipientIdentity = `${p.channel.organization.name} (${p.channel.organization.shortName})`;
          } else if (p.event?.organization) {
            recipientIdentity = `${p.event.organization.name} (${p.event.organization.shortName})`;
          }
        }
        
        return {
          id: p.id,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
          status: p.status,
          gross: p.amountCents,
          processorFee: p.processorFeeCents,
          platformFee: p.platformFeeCents,
          net: p.ownerNetCents,
          recipientType: p.recipientType,
          recipientIdentity,
          recipientOwnerAccountId: p.recipientOwnerAccountId,
          recipientOrganizationId: p.recipientOrganizationId,
          viewer: {
            email: p.viewer.email,
            phoneE164: p.viewer.phoneE164,
          },
          game: p.game ? {
            id: p.game.id,
            title: p.game.title,
          } : null,
          channel: p.channel ? {
            id: p.channel.id,
            teamSlug: p.channel.teamSlug,
            displayName: p.channel.displayName,
            orgShortName: p.channel.organization.shortName,
          } : null,
          event: p.event ? {
            id: p.event.id,
            canonicalPath: p.event.canonicalPath,
            orgShortName: p.event.organization.shortName,
          } : null,
        };
      });
      
      res.json({
        purchases: formatted,
        total,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      next(error);
    }
  })();
});

/**
 * GET /api/admin/purchases/:purchaseId
 * 
 * Get detailed purchase breakdown with recipient information.
 */
router.get('/purchases/:purchaseId', requireAdminAuth, auditLog({ actionType: 'view_purchase', targetType: 'purchase' }), (req: AuthRequest, res, next) => {
  void (async () => {
    try {
      const { purchaseId } = req.params;
      
      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          game: {
            include: {
              ownerAccount: true,
            },
          },
          channel: {
            include: {
              organization: true,
            },
          },
          event: {
            include: {
              organization: true,
            },
          },
          viewer: true,
          refunds: true,
        },
      });
      
      if (!purchase) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Purchase not found' } });
      }
      
      // Determine recipient identity
      let recipientIdentity: string | null = null;
      if (purchase.recipientType === 'personal' && purchase.game?.ownerAccount) {
        recipientIdentity = purchase.game.ownerAccount.contactEmail;
      } else if (purchase.recipientType === 'organization') {
        if (purchase.channel?.organization) {
          recipientIdentity = `${purchase.channel.organization.name} (${purchase.channel.organization.shortName})`;
        } else if (purchase.event?.organization) {
          recipientIdentity = `${purchase.event.organization.name} (${purchase.event.organization.shortName})`;
        }
      }
      
      res.json({
        id: purchase.id,
        createdAt: purchase.createdAt,
        paidAt: purchase.paidAt,
        failedAt: purchase.failedAt,
        refundedAt: purchase.refundedAt,
        status: purchase.status,
        gross: purchase.amountCents,
        processorFee: purchase.processorFeeCents,
        platformFee: purchase.platformFeeCents,
        net: purchase.ownerNetCents,
        recipientType: purchase.recipientType,
        recipientIdentity,
        recipientOwnerAccountId: purchase.recipientOwnerAccountId,
        recipientOrganizationId: purchase.recipientOrganizationId,
        viewer: {
          id: purchase.viewer.id,
          email: purchase.viewer.email,
          phoneE164: purchase.viewer.phoneE164,
        },
        game: purchase.game ? {
          id: purchase.game.id,
          title: purchase.game.title,
          ownerAccount: {
            id: purchase.game.ownerAccount.id,
            contactEmail: purchase.game.ownerAccount.contactEmail,
            name: purchase.game.ownerAccount.name,
          },
        } : null,
        channel: purchase.channel ? {
          id: purchase.channel.id,
          teamSlug: purchase.channel.teamSlug,
          displayName: purchase.channel.displayName,
          organization: {
            id: purchase.channel.organization.id,
            shortName: purchase.channel.organization.shortName,
            name: purchase.channel.organization.name,
          },
        } : null,
        event: purchase.event ? {
          id: purchase.event.id,
          canonicalPath: purchase.event.canonicalPath,
          organization: {
            id: purchase.event.organization.id,
            shortName: purchase.event.organization.shortName,
            name: purchase.event.organization.name,
          },
        } : null,
        refunds: purchase.refunds.map((r: any) => ({
          id: r.id,
          amountCents: r.amountCents,
          reasonCode: r.reasonCode,
          issuedBy: r.issuedBy,
          createdAt: r.createdAt,
          processedAt: r.processedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  })();
});

export function createAdminRouter(): Router {
  return router;
}
