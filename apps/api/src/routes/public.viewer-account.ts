/**
 * Public Viewer Account Routes
 *
 * Endpoints for viewer self-service account management:
 * - PATCH /api/public/viewer/:viewerIdentityId          — Update profile (name)
 * - GET  /api/public/viewer/:viewerIdentityId/subscriptions — List NotifyMe subscriptions
 * - GET  /api/public/viewer/:viewerIdentityId/purchases     — List payment history
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = express.Router();

const ViewerIdParam = z.object({
  viewerIdentityId: z.string().uuid('Invalid viewer identity id'),
});

const UpdateProfileBody = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().max(100).optional(),
}).refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
  message: 'At least one field (firstName or lastName) must be provided',
});

/**
 * PATCH /api/public/viewer/:viewerIdentityId
 * Update viewer profile (name fields only).
 */
router.patch(
  '/:viewerIdentityId',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const params = ViewerIdParam.safeParse(req.params);
        if (!params.success) {
          return res.status(400).json({ error: 'Invalid viewer ID', details: params.error.errors });
        }

        const body = UpdateProfileBody.safeParse(req.body);
        if (!body.success) {
          return res.status(400).json({ error: 'Validation failed', details: body.error.errors.map((e) => e.message) });
        }

        const viewer = await prisma.viewerIdentity.findUnique({
          where: { id: params.data.viewerIdentityId },
        });

        if (!viewer) {
          return res.status(404).json({ error: 'Viewer not found' });
        }

        const updated = await prisma.viewerIdentity.update({
          where: { id: params.data.viewerIdentityId },
          data: {
            ...(body.data.firstName !== undefined && { firstName: body.data.firstName }),
            ...(body.data.lastName !== undefined && { lastName: body.data.lastName }),
          },
          select: { firstName: true, lastName: true },
        });

        logger.info({ viewerIdentityId: params.data.viewerIdentityId }, 'Viewer profile updated');
        return res.json({ updated: true, ...updated });
      } catch (error) {
        logger.error({ error, viewerIdentityId: req.params.viewerIdentityId }, 'Failed to update viewer profile');
        next(error);
      }
    })();
  },
);

/**
 * GET /api/public/viewer/:viewerIdentityId/subscriptions
 * List all streams viewer is subscribed to (wantsReminders = true).
 */
router.get(
  '/:viewerIdentityId/subscriptions',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const params = ViewerIdParam.safeParse(req.params);
        if (!params.success) {
          return res.status(400).json({ error: 'Invalid viewer ID', details: params.error.errors });
        }

        const registrations = await prisma.directStreamRegistration.findMany({
          where: {
            viewerIdentityId: params.data.viewerIdentityId,
            wantsReminders: true,
          },
          include: {
            directStream: {
              select: {
                slug: true,
                title: true,
                scheduledStartAt: true,
              },
            },
          },
          orderBy: { registeredAt: 'desc' },
        });

        const subscriptions = registrations
          .filter((r) => r.directStream)
          .map((r) => ({
            slug: r.directStream.slug,
            title: r.directStream.title,
            scheduledStartAt: r.directStream.scheduledStartAt,
            subscribedAt: r.registeredAt,
          }));

        return res.json({ subscriptions });
      } catch (error) {
        logger.error({ error, viewerIdentityId: req.params.viewerIdentityId }, 'Failed to list subscriptions');
        next(error);
      }
    })();
  },
);

/**
 * GET /api/public/viewer/:viewerIdentityId/purchases
 * List all purchases for a viewer with receipt details.
 */
router.get(
  '/:viewerIdentityId/purchases',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const params = ViewerIdParam.safeParse(req.params);
        if (!params.success) {
          return res.status(400).json({ error: 'Invalid viewer ID', details: params.error.errors });
        }

        const purchases = await prisma.purchase.findMany({
          where: {
            viewerId: params.data.viewerIdentityId,
            status: { in: ['paid', 'refunded', 'partially_refunded'] },
          },
          select: {
            id: true,
            amountCents: true,
            currency: true,
            discountCents: true,
            platformFeeCents: true,
            status: true,
            paidAt: true,
            refundedAt: true,
            cardLastFour: true,
            cardBrand: true,
            directStream: { select: { slug: true, title: true } },
            game: { select: { id: true, title: true } },
            channel: { select: { id: true, displayName: true } },
            refunds: { select: { amountCents: true, reasonCode: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const formatted = purchases.map((p) => {
          const streamTitle = p.directStream?.title ?? p.game?.title ?? p.channel?.displayName ?? 'Unknown';
          const streamSlug = p.directStream?.slug ?? null;
          const streamLink = streamSlug ? `/direct/${streamSlug}` : p.game?.id ? `/game/${p.game.id}` : null;

          return {
            id: p.id,
            streamTitle,
            streamSlug,
            streamLink,
            amountCents: p.amountCents,
            currency: p.currency,
            discountCents: p.discountCents,
            platformFeeCents: p.platformFeeCents,
            status: p.status,
            paidAt: p.paidAt,
            refundedAt: p.refundedAt,
            cardLastFour: p.cardLastFour,
            cardBrand: p.cardBrand,
            refunds: p.refunds.map((r: { amountCents: number; reasonCode: string; createdAt: Date }) => ({
              amountCents: r.amountCents,
              reason: r.reasonCode,
              createdAt: r.createdAt,
            })),
          };
        });

        return res.json({ purchases: formatted });
      } catch (error) {
        logger.error({ error, viewerIdentityId: req.params.viewerIdentityId }, 'Failed to list purchases');
        next(error);
      }
    })();
  },
);

export function createPublicViewerAccountRouter(): express.Router {
  return router;
}
