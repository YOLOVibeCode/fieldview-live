/**
 * Public DirectStream Registration Routes
 * 
 * Endpoints:
 * - POST /api/public/direct/:slug/register
 * - GET /api/public/direct/verify?token=...
 * - POST /api/public/direct/:slug/resend-verification
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import {
  DirectStreamRegisterSchema,
  ResendVerificationSchema,
} from '@fieldview/data-model';
import { DirectStreamRegistrationRepository } from '../repositories/implementations/DirectStreamRegistrationRepository';
import { EmailVerificationRepository } from '../repositories/implementations/EmailVerificationRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { RegistrationService } from '../services/RegistrationService';
import { EmailVerificationService } from '../services/EmailVerificationService';
import { getEmailProvider } from '../lib/email';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = express.Router();

// Initialize repositories and services
const registrationReader = new DirectStreamRegistrationRepository();
const registrationWriter = new DirectStreamRegistrationRepository();
const tokenReader = new EmailVerificationRepository();
const tokenWriter = new EmailVerificationRepository();
const viewerReader = new ViewerIdentityRepository(prisma);
const viewerWriter = new ViewerIdentityRepository(prisma);
const emailProvider = getEmailProvider();

const verificationService = new EmailVerificationService(
  tokenReader,
  tokenWriter,
  viewerReader,
  viewerWriter,
  emailProvider
);

const registrationService = new RegistrationService(
  registrationReader,
  registrationWriter,
  viewerReader,
  viewerWriter,
  verificationService
);

/**
 * POST /api/public/direct/:slug/register
 * Register a viewer for a DirectStream
 */
router.post(
  '/:slug/register',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const validation = DirectStreamRegisterSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
          });
        }

        const { email, firstName, lastName, wantsReminders } = validation.data;

        // Fetch DirectStream
        const stream = await prisma.directStream.findUnique({
          where: { slug, status: 'active' },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Register
        const result = await registrationService.registerForStream(stream.id, {
          email,
          firstName,
          lastName,
          wantsReminders,
        });

        logger.info({ slug, email, viewerId: result.viewerId }, 'Viewer registered for DirectStream');

        res.status(201).json({
          message: 'Registration successful. Please check your email to verify.',
          status: result.status,
          viewerId: result.viewerId,
        });
      } catch (error: any) {
        logger.error({ error, slug: req.params.slug }, 'Failed to register viewer');
        next(error);
      }
    })();
  }
);

/**
 * GET /api/public/direct/verify?token=...
 * Verify email token
 */
router.get('/verify', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
      }

      const result = await verificationService.verifyToken(token);

      if (result.success) {
        logger.info({ viewerId: result.viewerId }, 'Email verified successfully');
        return res.json({
          success: true,
          message: 'Email verified successfully!',
          viewerId: result.viewerId,
          streamId: result.streamId,
        });
      } else {
        logger.warn({ reason: result.reason, resent: result.resent }, 'Email verification failed');
        return res.status(400).json({
          success: false,
          reason: result.reason,
          resent: result.resent,
          message:
            result.reason === 'expired' && result.resent
              ? 'Link expired. We sent you a fresh verification email!'
              : result.reason === 'expired'
              ? 'Link expired. Please register again.'
              : 'Invalid verification link.',
        });
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to verify token');
      next(error);
    }
  })();
});

/**
 * POST /api/public/direct/:slug/resend-verification
 * Resend verification email
 */
router.post(
  '/:slug/resend-verification',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { slug } = req.params;
        const validation = ResendVerificationSchema.safeParse(req.body);

        if (!validation.success) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const { email } = validation.data;

        // Fetch DirectStream
        const stream = await prisma.directStream.findUnique({
          where: { slug, status: 'active' },
        });

        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }

        // Resend
        await registrationService.resendVerification(stream.id, email);

        logger.info({ slug, email }, 'Verification email resent');

        res.json({ message: 'Verification email sent. Please check your inbox.' });
      } catch (error: any) {
        logger.error({ error, slug: req.params.slug }, 'Failed to resend verification');
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: 'Viewer not found. Please register first.' });
        }
        next(error);
      }
    })();
  }
);

export function createPublicDirectRegistrationRouter(): express.Router {
  return router;
}

