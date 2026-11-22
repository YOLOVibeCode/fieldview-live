/**
 * Password reset for coaches (owner logins).
 *
 * POST /api/auth/password-reset/request  { email }            → 200, the same answer for every email
 * POST /api/auth/password-reset/verify   { token }            → 200 { valid, message? }
 * POST /api/auth/password-reset/confirm  { token, newPassword } → 200, or 400 PASSWORD_RESET_FAILED
 *
 * Admin accounts are not reset by email: whoever controls an admin's inbox could otherwise
 * replace the password and set up MFA again. The token travels in the request body, never in
 * the URL, so request logs never hold it.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { passwordResetRequestRateLimit, passwordResetTokenRateLimit } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import { PasswordResetTokenRepository } from '../repositories/implementations/PasswordResetTokenRepository';
import type { IPasswordResetService } from '../services/IPasswordResetService';
import { PasswordResetService } from '../services/PasswordResetService';

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  userType: z.literal('owner_user').default('owner_user'),
});

const tokenSchema = z.string().min(1, 'Token is required').max(200);

const verifySchema = z.object({ token: tokenSchema });

const confirmSchema = z.object({
  token: tokenSchema,
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

function defaultService(): IPasswordResetService {
  return new PasswordResetService(new PasswordResetTokenRepository(prisma), prisma);
}

export function createPasswordResetRouter(service: IPasswordResetService = defaultService()): Router {
  const router = Router();

  router.post(
    '/request',
    validateRequest({ body: requestSchema }),
    passwordResetRequestRateLimit,
    (req: Request, res: Response, next: NextFunction) => {
      void (async () => {
        try {
          const { email } = req.body as z.infer<typeof requestSchema>;
          const result = await service.requestReset({
            email,
            userType: 'owner_user',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          res.status(200).json({ success: true, message: result.message });
        } catch (error) {
          next(error);
        }
      })();
    }
  );

  router.post(
    '/verify',
    validateRequest({ body: verifySchema }),
    passwordResetTokenRateLimit,
    (req: Request, res: Response, next: NextFunction) => {
      void (async () => {
        try {
          const { token } = req.body as z.infer<typeof verifySchema>;
          const result = await service.verifyToken(token);
          res.status(200).json(result.valid ? { valid: true } : { valid: false, message: result.error });
        } catch (error) {
          next(error);
        }
      })();
    }
  );

  router.post(
    '/confirm',
    validateRequest({ body: confirmSchema }),
    passwordResetTokenRateLimit,
    (req: Request, res: Response, next: NextFunction) => {
      void (async () => {
        try {
          const { token, newPassword } = req.body as z.infer<typeof confirmSchema>;
          const result = await service.confirmReset({ token, newPassword });
          if (!result.success) {
            throw new AppError('PASSWORD_RESET_FAILED', result.message, 400);
          }
          res.status(200).json({ success: true, message: result.message });
        } catch (error) {
          next(error);
        }
      })();
    }
  );

  return router;
}
