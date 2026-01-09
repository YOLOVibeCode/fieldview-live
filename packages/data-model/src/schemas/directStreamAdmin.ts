/**
 * DirectStream Admin Zod Schemas
 * 
 * Validation schemas for Super Admin DirectStream management.
 */

import { z } from 'zod';

export const CreateDirectStreamSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  title: z.string().min(1, 'Title required').max(200),
  streamUrl: z.string().url('Invalid stream URL').optional(),
  scheduledStartAt: z.string().datetime().optional(), // ISO 8601
  paywallEnabled: z.boolean().optional().default(false),
  priceInCents: z.number().int().min(0).max(1000000).optional().default(0),
  paywallMessage: z.string().max(1000).optional(),
  allowSavePayment: z.boolean().optional().default(false),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
  chatEnabled: z.boolean().optional().default(true),
  scoreboardEnabled: z.boolean().optional().default(false),
  allowAnonymousView: z.boolean().optional().default(true),
  requireEmailVerification: z.boolean().optional().default(true),
  listed: z.boolean().optional().default(true),
  sendReminders: z.boolean().optional().default(true),
  reminderMinutes: z.number().int().min(1).max(1440).optional().default(5),
});

export const UpdateDirectStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  streamUrl: z.string().url().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  paywallEnabled: z.boolean().optional(),
  priceInCents: z.number().int().min(0).max(1000000).optional(),
  paywallMessage: z.string().max(1000).optional(),
  allowSavePayment: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  scoreboardEnabled: z.boolean().optional(),
  allowAnonymousView: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  listed: z.boolean().optional(),
  sendReminders: z.boolean().optional(),
  reminderMinutes: z.number().int().min(1).max(1440).optional(),
});

export const ImpersonateStreamAdminSchema = z.object({
  slug: z.string().min(1),
});

export type CreateDirectStream = z.infer<typeof CreateDirectStreamSchema>;
export type UpdateDirectStream = z.infer<typeof UpdateDirectStreamSchema>;
export type ImpersonateStreamAdmin = z.infer<typeof ImpersonateStreamAdminSchema>;

