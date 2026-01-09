/**
 * Admin Coupon Routes
 *
 * CRUD endpoints for coupon code management.
 * Super admin only for create/update, support admin can view.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireAdminAuth } from '../middleware/adminAuth';
import { auditLog } from '../middleware/auditLog';
import type { AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CouponRepository } from '../repositories/implementations/CouponRepository';

const router = express.Router();

// Validation schemas
const CreateCouponSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/, 'Code must be uppercase alphanumeric'),
  discountType: z.enum(['percentage', 'fixed_cents']),
  discountValue: z.number().int().positive(),
  ownerAccountId: z.string().uuid().optional().nullable(),
  gameId: z.string().uuid().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerViewer: z.number().int().positive().optional().default(1),
  minPurchaseCents: z.number().int().nonnegative().optional().nullable(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional().nullable(),
});

const UpdateCouponSchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
});

const ListCouponsQuerySchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * POST /api/admin/coupons
 *
 * Create a new coupon code. Super admin only.
 */
router.post(
  '/',
  requireAdminAuth,
  auditLog({ actionType: 'coupon_create', targetType: 'coupon' }),
  validateRequest({ body: CreateCouponSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        // Only super_admin can create coupons
        if (req.role !== 'super_admin') {
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } });
        }

        const adminAccountId = req.adminUserId;
        if (!adminAccountId) {
          return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        }

        const body = req.body as z.infer<typeof CreateCouponSchema>;

        const couponRepo = new CouponRepository(prisma);

        // Check if code already exists
        const existing = await couponRepo.getByCode(body.code);
        if (existing) {
          return res.status(409).json({ error: { code: 'CONFLICT', message: 'Coupon code already exists' } });
        }

        const coupon = await couponRepo.create({
          code: body.code.toUpperCase(),
          discountType: body.discountType,
          discountValue: body.discountValue,
          ownerAccountId: body.ownerAccountId ?? null,
          gameId: body.gameId ?? null,
          maxUses: body.maxUses ?? null,
          maxUsesPerViewer: body.maxUsesPerViewer ?? 1,
          minPurchaseCents: body.minPurchaseCents ?? null,
          validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
          validTo: body.validTo ? new Date(body.validTo) : null,
          createdByAdminId: adminAccountId,
        });

        res.status(201).json(coupon);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/admin/coupons
 *
 * List all coupons with pagination.
 */
router.get(
  '/',
  requireAdminAuth,
  auditLog({ actionType: 'coupon_list', targetType: 'coupon' }),
  validateRequest({ query: ListCouponsQuerySchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const query = req.query as unknown as z.infer<typeof ListCouponsQuerySchema>;
        const couponRepo = new CouponRepository(prisma);

        const result = await couponRepo.list({
          status: query.status,
          limit: query.limit,
          offset: query.offset,
        });

        res.json({
          coupons: result.coupons,
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/admin/coupons/:couponId
 *
 * Get coupon details with redemption history.
 */
router.get(
  '/:couponId',
  requireAdminAuth,
  auditLog({ actionType: 'coupon_view', targetType: 'coupon' }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        const { couponId } = req.params;

        const coupon = await prisma.couponCode.findUnique({
          where: { id: couponId },
          include: {
            redemptions: {
              include: {
                coupon: false,
              },
              orderBy: { createdAt: 'desc' },
              take: 100,
            },
            _count: {
              select: { redemptions: true },
            },
          },
        });

        if (!coupon) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
        }

        // Get viewer emails for redemptions
        const viewerIds = coupon.redemptions.map((r: any) => r.viewerId);
        const viewers = await prisma.viewerIdentity.findMany({
          where: { id: { in: viewerIds } },
          select: { id: true, email: true },
        });
        const viewerMap = new Map(viewers.map((v: any) => [v.id, v.email]));

        const redemptionsWithEmail = coupon.redemptions.map((r: any) => ({
          id: r.id,
          purchaseId: r.purchaseId,
          viewerEmail: viewerMap.get(r.viewerId) ?? 'unknown',
          discountCents: r.discountCents,
          createdAt: r.createdAt,
        }));

        res.json({
          ...coupon,
          redemptions: redemptionsWithEmail,
          totalRedemptions: coupon._count.redemptions,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/admin/coupons/:couponId
 *
 * Update coupon (status, maxUses, validTo). Super admin only.
 */
router.patch(
  '/:couponId',
  requireAdminAuth,
  auditLog({ actionType: 'coupon_update', targetType: 'coupon' }),
  validateRequest({ body: UpdateCouponSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (req.role !== 'super_admin') {
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } });
        }

        const couponId = req.params.couponId;
        if (!couponId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing couponId' } });
        }
        const body = req.body as z.infer<typeof UpdateCouponSchema>;

        const couponRepo = new CouponRepository(prisma);
        const existing = await couponRepo.getById(couponId);

        if (!existing) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
        }

        const updated = await couponRepo.update(couponId, {
          status: body.status,
          maxUses: body.maxUses,
          validTo: body.validTo ? new Date(body.validTo) : undefined,
        });

        res.json(updated);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/admin/coupons/:couponId
 *
 * Soft-delete (disable) a coupon. Super admin only.
 */
router.delete(
  '/:couponId',
  requireAdminAuth,
  auditLog({ actionType: 'coupon_delete', targetType: 'coupon' }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (req.role !== 'super_admin') {
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Super admin required' } });
        }

        const couponId = req.params.couponId;
        if (!couponId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing couponId' } });
        }

        const couponRepo = new CouponRepository(prisma);
        const existing = await couponRepo.getById(couponId);

        if (!existing) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Coupon not found' } });
        }

        await couponRepo.update(couponId, { status: 'disabled' });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createAdminCouponsRouter(): Router {
  return router;
}
