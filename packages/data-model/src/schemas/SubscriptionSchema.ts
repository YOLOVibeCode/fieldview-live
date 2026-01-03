/**
 * Subscription Schema
 *
 * Zod schemas for Subscription model validation.
 */

import { z } from 'zod';

export const SubscriptionPreferenceSchema = z.enum(['email', 'sms', 'both']);

export const SubscriptionStatusSchema = z.enum(['active', 'unsubscribed', 'bounced']);

export const CreateSubscriptionSchema = z
  .object({
    email: z.string().email(),
    phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
    organizationId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    preference: SubscriptionPreferenceSchema.default('email'),
  })
  .refine(
    (data) => data.organizationId || data.channelId || data.eventId,
    {
      message: 'Must provide at least one subscription target (organizationId, channelId, or eventId)',
      path: ['organizationId', 'channelId', 'eventId'],
    }
  );

export const UpdateSubscriptionSchema = z.object({
  preference: SubscriptionPreferenceSchema.optional(),
  status: SubscriptionStatusSchema.optional(),
});

export const ListSubscriptionsQuerySchema = z.object({
  viewerId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  status: SubscriptionStatusSchema.optional(),
  confirmed: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

