/**
 * Password Reset API Routes
 * Public routes for password reset functionality
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PasswordResetService } from '../services/PasswordResetService';
import { PasswordResetTokenRepository } from '../repositories/implementations/PasswordResetTokenRepository';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { logger } from '../lib/logger';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// Initialize service
const tokenRepo = new PasswordResetTokenRepository(prisma);
const passwordResetService = new PasswordResetService(tokenRepo, prisma);

// Validation schemas (inline to avoid import issues)
const passwordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  userType: z.enum(['owner_user', 'admin_account']),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

/**
 * POST /api/auth/password-reset/request
 * Request a password reset email
 */
router.post(
  '/request',
  validateRequest({ body: passwordResetRequestSchema }),
  async (req: Request, res: Response) => {
    try {
      const { email, userType } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await passwordResetService.requestReset({
        email,
        userType,
        ipAddress,
        userAgent,
      });

      // Rate limiting check
      if (!result.success) {
        return res.status(429).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error({ error }, 'Error handling password reset request');
      return res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again later.',
      });
    }
  }
);

/**
 * GET /api/auth/password-reset/verify/:token
 * Verify a password reset token
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Token is required',
        error: 'TOKEN_REQUIRED',
      });
    }

    const result = await passwordResetService.verifyToken(token);

    return res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Error verifying password reset token');
    return res.status(500).json({
      valid: false,
      error: 'An error occurred. Please try again.',
    });
  }
});

/**
 * POST /api/auth/password-reset/confirm
 * Confirm password reset with token and new password
 */
router.post(
  '/confirm',
  validateRequest({ body: passwordResetConfirmSchema }),
  async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      const result = await passwordResetService.confirmReset({
        token,
        newPassword,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error({ error }, 'Error confirming password reset');
      return res.status(500).json({
        success: false,
        error: 'An error occurred. Please try again later.',
      });
    }
  }
);

export { router as passwordResetRoutes };

