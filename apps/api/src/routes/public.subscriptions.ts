/**
 * Public Subscription Routes
 *
 * Allow viewers to subscribe to teams/events for notifications.
 */

import express, { type Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import { generateConfirmationToken, validateConfirmationToken } from '../lib/subscription-token';
import { NotificationService } from '../services/NotificationService';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';

const router = express.Router();

const SubscribeSchema = z.object({
  email: z.string().email(),
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  organizationId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  preference: z.enum(['email', 'sms', 'both']).default('email'),
});

/**
 * POST /api/public/subscriptions
 * Subscribe to a team or event for notifications.
 */
router.post(
  '/subscriptions',
  validateRequest({ body: SubscribeSchema }),
  (req, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const body = req.body as z.infer<typeof SubscribeSchema>;

        // Validate that at least one target is provided
        if (!body.organizationId && !body.channelId && !body.eventId) {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Must provide organizationId, channelId, or eventId' },
          });
        }

        // Get or create viewer identity
        let viewer = await prisma.viewerIdentity.findUnique({ where: { email: body.email } });
        if (!viewer) {
          viewer = await prisma.viewerIdentity.create({
            data: {
              email: body.email,
              phoneE164: body.phoneE164 ?? null,
              smsOptOut: body.preference === 'email',
            },
          });
        } else if (body.phoneE164 && !viewer.phoneE164) {
          // Update phone if provided and not set
          viewer = await prisma.viewerIdentity.update({
            where: { id: viewer.id },
            data: { phoneE164: body.phoneE164 },
          });
        }

        // Create subscription record(s)
        // If eventId is provided, create event-specific subscription
        // Otherwise, create org or channel subscription
        const subscriptionData: {
          viewerId: string;
          organizationId?: string;
          channelId?: string;
          eventId?: string;
          preference: string;
          confirmed: boolean;
        } = {
          viewerId: viewer.id,
          preference: body.preference,
          confirmed: false, // Require email confirmation
        };

        if (body.eventId) {
          subscriptionData.eventId = body.eventId;
        } else if (body.channelId) {
          subscriptionData.channelId = body.channelId;
        } else if (body.organizationId) {
          subscriptionData.organizationId = body.organizationId;
        }

        // Check if subscription already exists
        const existing = await prisma.subscription.findFirst({
          where: {
            viewerId: viewer.id,
            organizationId: subscriptionData.organizationId ?? null,
            channelId: subscriptionData.channelId ?? null,
            eventId: subscriptionData.eventId ?? null,
            status: 'active',
          },
        });

        let subscription;
        if (existing) {
          // Update existing subscription
          subscription = await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              preference: body.preference,
              status: 'active',
            },
          });
        } else {
          // Create new subscription
          subscription = await prisma.subscription.create({
            data: subscriptionData,
          });
        }

        // Generate confirmation token and send email (if not already confirmed)
        if (!subscription.confirmed) {
          const confirmationToken = generateConfirmationToken(subscription.id, viewer.email);
          const confirmationUrl = `${process.env.APP_URL || 'https://fieldview.live'}/api/public/subscriptions/confirm?token=${confirmationToken}`;

          // Send confirmation email
          const notificationService = new NotificationService(new ViewerIdentityRepository(prisma));
          await notificationService.sendEmail(
            viewer.email,
            'Confirm your subscription',
            `Click this link to confirm your subscription: ${confirmationUrl}\n\nThis link expires in 24 hours.`
          );
        }

        res.status(201).json({
          success: true,
          message: 'Subscribed successfully. Please check your email to confirm.',
          viewerId: viewer.id,
          confirmed: false,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/public/subscriptions/unsubscribe
 * Unsubscribe from notifications.
 */
router.post(
  '/subscriptions/unsubscribe',
  validateRequest({
    body: z.object({
      email: z.string().email(),
      token: z.string().optional(), // Optional tokenized unsubscribe link
    }),
  }),
  (req, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const body = req.body as { email: string; token?: string };

        const viewer = await prisma.viewerIdentity.findUnique({ where: { email: body.email } });
        if (!viewer) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found' } });
        }

        // Mark SMS opt-out
        await prisma.viewerIdentity.update({
          where: { id: viewer.id },
          data: { smsOptOut: true, optOutAt: new Date() },
        });

        // Mark all subscriptions as unsubscribed
        await prisma.subscription.updateMany({
          where: {
            viewerId: viewer.id,
            status: 'active',
          },
          data: {
            status: 'unsubscribed',
            unsubscribedAt: new Date(),
          },
        });

        res.json({ success: true, message: 'Unsubscribed successfully' });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/public/subscriptions/confirm
 * Confirm a subscription via email token.
 */
router.get(
  '/subscriptions/confirm',
  (req, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Confirmation token is required' },
          });
        }

        const { subscriptionId, viewerEmail, isValid } = validateConfirmationToken(token);
        if (!isValid) {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Invalid or expired confirmation token' },
          });
        }

        // Find subscription
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          include: { viewer: true },
        });

        if (!subscription) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Subscription not found' },
          });
        }

        // Verify email matches
        if (subscription.viewer.email !== viewerEmail) {
          return res.status(400).json({
            error: { code: 'BAD_REQUEST', message: 'Email mismatch' },
          });
        }

        // Already confirmed
        if (subscription.confirmed) {
          return res.status(200).json({
            success: true,
            message: 'Subscription already confirmed',
            confirmed: true,
          });
        }

        // Confirm subscription
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            confirmed: true,
            confirmedAt: new Date(),
          },
        });

        res.status(200).json({
          success: true,
          message: 'Subscription confirmed successfully',
          confirmed: true,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicSubscriptionsRouter(): Router {
  return router;
}

