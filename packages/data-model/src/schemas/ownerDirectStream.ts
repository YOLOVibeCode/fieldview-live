/**
 * Owner DirectStream Zod Schemas
 *
 * Validation schemas for owner-facing DirectStream management.
 */

import { z } from 'zod';

export const CreateOwnerDirectStreamSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug must be at most 80 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1, 'Title is required').max(200),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
  streamUrl: z.string().url('Invalid stream URL').optional(),
  scheduledStartAt: z.string().datetime().optional(),

  // Feature flags
  chatEnabled: z.boolean().optional().default(true),
  scoreboardEnabled: z.boolean().optional().default(false),

  // Paywall
  paywallEnabled: z.boolean().optional().default(false),
  priceInCents: z.number().int().min(0).max(1000000).optional().default(0),
  paywallMessage: z.string().max(1000).optional(),

  // Access control
  allowAnonymousView: z.boolean().optional().default(true),
  requireEmailVerification: z.boolean().optional().default(true),
  listed: z.boolean().optional().default(true),

  // Scoreboard defaults
  scoreboardHomeTeam: z.string().max(100).optional(),
  scoreboardAwayTeam: z.string().max(100).optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').optional(),
});

export const UpdateOwnerDirectStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  streamUrl: z.string().url().nullable().optional(),
  scheduledStartAt: z.string().datetime().nullable().optional(),

  // Feature flags
  chatEnabled: z.boolean().optional(),
  scoreboardEnabled: z.boolean().optional(),

  // Paywall
  paywallEnabled: z.boolean().optional(),
  priceInCents: z.number().int().min(0).max(1000000).optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),

  // Access control
  allowAnonymousView: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  listed: z.boolean().optional(),

  // Scoreboard defaults
  scoreboardHomeTeam: z.string().max(100).nullable().optional(),
  scoreboardAwayTeam: z.string().max(100).nullable().optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

export const ListOwnerDirectStreamsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'deleted', 'all']).optional().default('active'),
  sortBy: z.enum(['scheduledStartAt', 'createdAt', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateOwnerDirectStream = z.infer<typeof CreateOwnerDirectStreamSchema>;
export type UpdateOwnerDirectStream = z.infer<typeof UpdateOwnerDirectStreamSchema>;
export type ListOwnerDirectStreamsQuery = z.infer<typeof ListOwnerDirectStreamsQuerySchema>;
