/**
 * Owner DirectStreams Routes
 *
 * CRUD endpoints for authenticated owners to manage their DirectStreams.
 *
 * Endpoints:
 * - POST   /api/owners/direct-streams              (create)
 * - GET    /api/owners/direct-streams              (list)
 * - GET    /api/owners/direct-streams/:id          (get by ID)
 * - PATCH  /api/owners/direct-streams/:id          (update)
 * - POST   /api/owners/direct-streams/:id/archive  (archive)
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { OwnerDirectStreamRepository } from '../repositories/OwnerDirectStreamRepository';
import { OwnerDirectStreamService } from '../services/OwnerDirectStreamService';

// Validation schemas (inline to avoid cross-package ZodError instanceof issues)
const CreateOwnerDirectStreamSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug must be at most 80 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1, 'Title is required').max(200),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
  streamUrl: z.string().url('Invalid stream URL').optional(),
  scheduledStartAt: z.string().datetime().optional(),
  chatEnabled: z.boolean().optional().default(true),
  scoreboardEnabled: z.boolean().optional().default(false),
  paywallEnabled: z.boolean().optional().default(false),
  priceInCents: z.number().int().min(0).max(1000000).optional().default(0),
  paywallMessage: z.string().max(1000).optional(),
  allowAnonymousView: z.boolean().optional().default(true),
  requireEmailVerification: z.boolean().optional().default(true),
  listed: z.boolean().optional().default(true),
  scoreboardHomeTeam: z.string().max(100).optional(),
  scoreboardAwayTeam: z.string().max(100).optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').optional(),
});

const UpdateOwnerDirectStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  streamUrl: z.string().url().nullable().optional(),
  scheduledStartAt: z.string().datetime().nullable().optional(),
  chatEnabled: z.boolean().optional(),
  scoreboardEnabled: z.boolean().optional(),
  paywallEnabled: z.boolean().optional(),
  priceInCents: z.number().int().min(0).max(1000000).optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),
  allowAnonymousView: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  listed: z.boolean().optional(),
  scoreboardHomeTeam: z.string().max(100).nullable().optional(),
  scoreboardAwayTeam: z.string().max(100).nullable().optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

const ListOwnerDirectStreamsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'deleted', 'all']).optional().default('active'),
  sortBy: z.enum(['scheduledStartAt', 'createdAt', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const router = express.Router();

// Lazy initialization
let serviceInstance: OwnerDirectStreamService | null = null;

function getService(): OwnerDirectStreamService {
  if (!serviceInstance) {
    const repo = new OwnerDirectStreamRepository(prisma);
    serviceInstance = new OwnerDirectStreamService(repo, repo);
  }
  return serviceInstance;
}

// Export for testing (allows test to inject mock service)
export function setOwnerDirectStreamService(service: OwnerDirectStreamService): void {
  serviceInstance = service;
}

/**
 * POST /api/owners/direct-streams
 * Create a new DirectStream
 */
router.post(
  '/direct-streams',
  requireOwnerAuth,
  validateRequest({ body: CreateOwnerDirectStreamSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new UnauthorizedError('Owner account ID not found'));
        }

        const service = getService();
        const stream = await service.createStream(req.ownerAccountId, req.body);

        logger.info({ streamId: stream.id, slug: stream.slug, ownerAccountId: req.ownerAccountId }, 'Owner created DirectStream');

        res.status(201).json({
          message: 'DirectStream created successfully',
          stream: {
            id: stream.id,
            slug: stream.slug,
            title: stream.title,
            status: stream.status,
            streamUrl: stream.streamUrl,
            scheduledStartAt: stream.scheduledStartAt,
            paywallEnabled: stream.paywallEnabled,
            priceInCents: stream.priceInCents,
            chatEnabled: stream.chatEnabled,
            scoreboardEnabled: stream.scoreboardEnabled,
            listed: stream.listed,
            createdAt: stream.createdAt,
          },
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/direct-streams
 * List DirectStreams for the authenticated owner
 */
router.get(
  '/direct-streams',
  requireOwnerAuth,
  validateRequest({ query: ListOwnerDirectStreamsQuerySchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new UnauthorizedError('Owner account ID not found'));
        }

        const service = getService();
        const filters = req.query as Record<string, string>;
        const streams = await service.listStreams(req.ownerAccountId, filters);

        res.json({ streams });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/owners/direct-streams/:id
 * Get a specific DirectStream by ID
 */
router.get(
  '/direct-streams/:id',
  requireOwnerAuth,
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new UnauthorizedError('Owner account ID not found'));
        }

        const service = getService();
        const stream = await service.getStream(req.params.id!, req.ownerAccountId);

        if (!stream) {
          throw new NotFoundError('DirectStream not found');
        }

        res.json({
          stream: {
            id: stream.id,
            slug: stream.slug,
            title: stream.title,
            status: stream.status,
            streamUrl: stream.streamUrl,
            scheduledStartAt: stream.scheduledStartAt,
            paywallEnabled: stream.paywallEnabled,
            priceInCents: stream.priceInCents,
            chatEnabled: stream.chatEnabled,
            scoreboardEnabled: stream.scoreboardEnabled,
            listed: stream.listed,
            allowAnonymousView: stream.allowAnonymousView,
            requireEmailVerification: stream.requireEmailVerification,
            scoreboardHomeTeam: stream.scoreboardHomeTeam,
            scoreboardAwayTeam: stream.scoreboardAwayTeam,
            scoreboardHomeColor: stream.scoreboardHomeColor,
            scoreboardAwayColor: stream.scoreboardAwayColor,
            createdAt: stream.createdAt,
            updatedAt: stream.updatedAt,
          },
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * PATCH /api/owners/direct-streams/:id
 * Update an owned DirectStream
 */
router.patch(
  '/direct-streams/:id',
  requireOwnerAuth,
  validateRequest({ body: UpdateOwnerDirectStreamSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new UnauthorizedError('Owner account ID not found'));
        }

        const service = getService();
        const stream = await service.updateStream(req.params.id!, req.ownerAccountId, req.body);

        logger.info({ streamId: stream.id, slug: stream.slug }, 'Owner updated DirectStream');

        res.json({
          message: 'DirectStream updated successfully',
          stream: {
            id: stream.id,
            slug: stream.slug,
            title: stream.title,
            status: stream.status,
            streamUrl: stream.streamUrl,
            scheduledStartAt: stream.scheduledStartAt,
            paywallEnabled: stream.paywallEnabled,
            priceInCents: stream.priceInCents,
            chatEnabled: stream.chatEnabled,
            scoreboardEnabled: stream.scoreboardEnabled,
            listed: stream.listed,
            updatedAt: stream.updatedAt,
          },
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/direct-streams/:id/archive
 * Archive an owned DirectStream
 */
router.post(
  '/direct-streams/:id/archive',
  requireOwnerAuth,
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new UnauthorizedError('Owner account ID not found'));
        }

        const service = getService();
        const stream = await service.archiveStream(req.params.id!, req.ownerAccountId);

        logger.info({ streamId: stream.id, slug: stream.slug }, 'Owner archived DirectStream');

        res.json({
          message: 'DirectStream archived successfully',
          stream: {
            id: stream.id,
            slug: stream.slug,
            title: stream.title,
            status: stream.status,
          },
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersDirectStreamsRouter(): Router {
  return router;
}
