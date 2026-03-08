/**
 * Viewer Refresh API Routes
 * Public routes for viewer access refresh/re-consent
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ViewerRefreshService } from '../services/ViewerRefreshService';
import { ViewerRefreshTokenRepository } from '../repositories/implementations/ViewerRefreshTokenRepository';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { BadRequestError } from '../lib/errors';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// Initialize service
const tokenRepo = new ViewerRefreshTokenRepository(prisma);
const viewerRefreshService = new ViewerRefreshService(tokenRepo, prisma);

// Validation schemas
const viewerRefreshRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  directStreamId: z.string().uuid().optional(),
  gameId: z.string().uuid().optional(),
  redirectUrl: z.string().optional(),
});

/**
 * POST /api/auth/viewer-refresh/request
 * Request viewer access refresh
 */
router.post(
  '/request',
  validateRequest({ body: viewerRefreshRequestSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, directStreamId, gameId, redirectUrl } = req.body;

      const result = await viewerRefreshService.requestRefresh({
        email,
        directStreamId,
        gameId,
        redirectUrl,
      });

      // Rate limiting check
      if (!result.success) {
        return res.status(429).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error({ error }, 'Error handling viewer refresh request');
      next(error);
    }
  }
);

/**
 * GET /api/auth/viewer-refresh/verify/:token
 * Verify refresh token and restore access
 */
router.get('/verify/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new BadRequestError('Token is required');
    }

    const result = await viewerRefreshService.verifyAndRestoreAccess(token);

    return res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error verifying viewer refresh token');
    next(error);
  }
});

export { router as viewerRefreshRoutes };

