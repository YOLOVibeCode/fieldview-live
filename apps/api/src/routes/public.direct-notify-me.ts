/**
 * Public DirectStream Notify-Me Routes
 *
 * Endpoint:
 * - POST /api/public/direct/:slug/notify-me
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createNotifyMeService } from '../services/notify-me.implementations';

const router = express.Router();

const NotifyMePostSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  viewerIdentityId: z.string().uuid('Invalid viewer identity id').optional(),
}).refine((data) => data.email ?? data.viewerIdentityId, {
  message: 'Either email or viewerIdentityId is required',
});

const NotifyMeStatusQuerySchema = z.object({
  viewerIdentityId: z.string().uuid('Viewer identity id is required'),
});

const NotifyMeDeleteSchema = z.object({
  viewerIdentityId: z.string().uuid('Viewer identity id is required'),
});

const notifyMeService = createNotifyMeService(prisma);

/**
 * GET /api/public/direct/:slug/notify-me/status?viewerIdentityId=xxx
 * Check if authenticated viewer is already subscribed to reminders.
 */
router.get(
  '/:slug/notify-me/status',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const query = NotifyMeStatusQuerySchema.safeParse(req.query);
        if (!query.success) {
          throw new BadRequestError('Validation failed', query.error.errors.map((e) => e.message));
        }
        const result = await notifyMeService.checkSubscription(slug, query.data.viewerIdentityId);
        return res.json(result);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message?.startsWith('Stream not found')) {
          throw new NotFoundError(err.message);
        }
        logger.error({ error, slug: req.params.slug }, 'Failed to check notify-me status');
        next(error);
      }
    })();
  },
);

/**
 * POST /api/public/direct/:slug/notify-me
 * Lightweight "notify me" signup — email or viewerIdentityId (authenticated).
 */
router.post(
  '/:slug/notify-me',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const validation = NotifyMePostSchema.safeParse(req.body);

        if (!validation.success) {
          throw new BadRequestError('Validation failed', validation.error.errors.map((e) => e.message));
        }

        const { email, viewerIdentityId } = validation.data;
        const result = viewerIdentityId
          ? await notifyMeService.subscribeById({ slug, viewerIdentityId })
          : await notifyMeService.subscribe({ slug, email: email! });

        logger.info(
          { slug, status: result.status, viewerId: result.viewerId },
          'Notify-me subscription',
        );

        return res.json({
          status: result.status,
          viewerId: result.viewerId,
        });
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message?.startsWith('Stream not found')) {
          throw new NotFoundError(err.message);
        }
        if (err.message === 'Viewer not found') {
          throw new NotFoundError(err.message);
        }
        logger.error({ error, slug: req.params.slug }, 'Failed to process notify-me');
        next(error);
      }
    })();
  },
);

/**
 * DELETE /api/public/direct/:slug/notify-me
 * Unsubscribe from reminders (viewerIdentityId in body).
 */
router.delete(
  '/:slug/notify-me',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const validation = NotifyMeDeleteSchema.safeParse(req.body);

        if (!validation.success) {
          throw new BadRequestError('Validation failed', validation.error.errors.map((e) => e.message));
        }

        const result = await notifyMeService.unsubscribe({
          slug,
          viewerIdentityId: validation.data.viewerIdentityId,
        });

        if (result.status === 'not_found') {
          throw new NotFoundError('Subscription not found');
        }

        logger.info(
          { slug, viewerIdentityId: validation.data.viewerIdentityId },
          'Notify-me unsubscribe',
        );

        return res.json({ status: result.status });
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message?.startsWith('Stream not found')) {
          throw new NotFoundError(err.message);
        }
        logger.error({ error, slug: req.params.slug }, 'Failed to process notify-me unsubscribe');
        next(error);
      }
    })();
  },
);

export function createPublicDirectNotifyMeRouter(): express.Router {
  return router;
}
