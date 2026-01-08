/**
 * Public Coupon Routes
 *
 * Public endpoint for validating coupon codes during checkout.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { CouponRepository } from '../repositories/implementations/CouponRepository';
import { CouponService } from '../services/CouponService';

const router = express.Router();

// Validation schema
const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(20),
  gameId: z.string().uuid().optional(),
  viewerEmail: z.string().email(),
});

/**
 * POST /api/public/coupons/validate
 *
 * Validate a coupon code and return discount preview.
 * Does not consume the coupon - just checks validity.
 */
router.post(
  '/validate',
  validateRequest({ body: ValidateCouponSchema }),
  (req, res, next) => {
    void (async () => {
      try {
        const body = req.body as z.infer<typeof ValidateCouponSchema>;

        // Find or create viewer identity
        let viewer = await prisma.viewerIdentity.findUnique({
          where: { email: body.viewerEmail.toLowerCase() },
        });

        if (!viewer) {
          // Create a temporary viewer ID for validation
          viewer = await prisma.viewerIdentity.create({
            data: {
              email: body.viewerEmail.toLowerCase(),
            },
          });
        }

        // Get game to find owner and price
        let ownerAccountId: string | null = null;
        let amountCents = 0;

        if (body.gameId) {
          const game = await prisma.game.findUnique({
            where: { id: body.gameId },
            select: { ownerAccountId: true, priceCents: true },
          });

          if (!game) {
            return res.status(404).json({
              valid: false,
              error: 'Game not found',
            });
          }

          ownerAccountId = game.ownerAccountId;
          amountCents = game.priceCents;
        }

        // Validate coupon
        const couponRepo = new CouponRepository(prisma);
        const couponService = new CouponService(couponRepo, couponRepo);

        const result = await couponService.validateCoupon({
          code: body.code,
          gameId: body.gameId ?? null,
          ownerAccountId,
          viewerId: viewer.id,
          amountCents,
        });

        if (!result.valid) {
          return res.json({
            valid: false,
            error: result.error,
          });
        }

        res.json({
          valid: true,
          discountCents: result.discountCents,
          discountType: result.discountType,
          discountValue: result.discountValue,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicCouponsRouter(): Router {
  return router;
}
