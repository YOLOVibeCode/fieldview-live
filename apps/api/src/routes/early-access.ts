/**
 * Early Access Signup Routes
 * 
 * Handles email collection for launch notifications
 */

import express, { type Request, type Response, type Router, type NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sendEmail } from '../lib/email';
import { validateRequest } from '../middleware/validation';
import { AppError } from '../lib/errors';

const router = express.Router();

// Validation schema
const EarlyAccessSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(100).optional(),
  source: z.enum(['veo', 'organic']).optional(),
});

/**
 * POST /api/early-access/signup
 * Register interest for early access
 */
router.post(
  '/signup',
  validateRequest({ body: EarlyAccessSignupSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, source } = req.body as z.infer<typeof EarlyAccessSignupSchema>;

      // Check if already signed up
      const existing = await prisma.earlyAccessSignup.findUnique({
        where: { email },
      });

      if (existing) {
        return res.status(200).json({
          message: 'You\'re already on the list!',
          alreadySignedUp: true,
        });
      }

      // Create signup
      const signup = await prisma.earlyAccessSignup.create({
        data: {
          email,
          name: name || null,
          source: source || 'organic',
        },
      });

      logger.info({ email, source }, 'Early access signup');

      // Send confirmation email
      try {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 48px; margin-bottom: 10px;">🚀</div>
              <h1 style="color: #2563eb; margin: 0;">You're on the List!</h1>
            </div>
            
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;">Hey${name ? ` ${name}` : ''}! 👋</p>
              <p style="margin: 0;">Thanks for your interest in FieldView.Live! We're excited to have you join us for our public beta launch.</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">📅 <strong>Launch Date:</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #2563eb;">February 15, 2026</p>
            </div>

            <h2 style="color: #1f2937; font-size: 18px; margin-top: 30px;">What's Coming:</h2>
            <ul style="color: #4b5563; padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>💰 Monetize Your Veo Streams</strong> — Built-in paywalls with instant Square payments</li>
              <li style="margin-bottom: 10px;"><strong>🔒 IP-Locked Links</strong> — Prevent unauthorized sharing</li>
              <li style="margin-bottom: 10px;"><strong>📱 Mobile-First Design</strong> — Beautiful viewing experience on any device</li>
              <li style="margin-bottom: 10px;"><strong>🎁 Free Tier</strong> — Try 5 free games before enabling paywalls</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 14px;">We'll send you another email as we get closer to launch with early access instructions.</p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">FieldView.Live</p>
              <p style="margin: 5px 0 0 0;">Protective streaming for youth sports</p>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: email,
          subject: '🚀 You\'re on the List! FieldView.Live Beta',
          html,
        });
      } catch (emailError) {
        // Log email error but don't fail the signup
        logger.error({ emailError, email }, 'Failed to send early access confirmation email');
      }

      res.status(201).json({
        message: 'Thanks! We\'ll notify you on February 15, 2026.',
        alreadySignedUp: false,
        id: signup.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/early-access/count
 * Get signup count (public)
 */
router.get('/count', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.earlyAccessSignup.count();
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

export function createEarlyAccessRouter(): Router {
  return router;
}
