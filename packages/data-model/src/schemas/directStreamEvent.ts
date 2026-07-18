/**
 * DirectStreamEvent Zod Schemas
 * 
 * Validation schemas for sub-events under a DirectStream parent.
 */

import { z } from 'zod';

/**
 * Create DirectStreamEvent Schema
 * 
 * All fields required except overrides (which inherit from parent if null)
 */
export const CreateDirectStreamEventSchema = z.object({
  directStreamId: z.string().uuid('Invalid parent stream ID'),
  eventSlug: z.string()
    .min(2, 'Event slug must be at least 2 characters')
    .max(100, 'Event slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Event slug must be lowercase alphanumeric with hyphens'),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  streamUrl: z.string().url().nullable().optional(),
  scheduledStartAt: z.coerce.date().nullable().optional(),
  
  // Feature flag overrides (null = inherit from parent)
  chatEnabled: z.boolean().nullable().optional(),
  scoreboardEnabled: z.boolean().nullable().optional(),
  paywallEnabled: z.boolean().nullable().optional(),
  priceInCents: z.number().int().min(0).max(1000000).nullable().optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),
  allowAnonymousView: z.boolean().nullable().optional(),
  requireEmailVerification: z.boolean().nullable().optional(),
  listed: z.boolean().nullable().optional(),
  
  // Scoreboard overrides (null = inherit from parent)
  scoreboardHomeTeam: z.string().max(100).nullable().optional(),
  scoreboardAwayTeam: z.string().max(100).nullable().optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

/**
 * Update DirectStreamEvent Schema
 * 
 * All fields optional (partial update)
 */
export const UpdateDirectStreamEventSchema = z.object({
  eventSlug: z.string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  title: z.string().min(3).max(200).optional(),
  streamUrl: z.string().url().nullable().optional(),
  scheduledStartAt: z.coerce.date().nullable().optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  
  // Feature flag overrides
  chatEnabled: z.boolean().nullable().optional(),
  scoreboardEnabled: z.boolean().nullable().optional(),
  paywallEnabled: z.boolean().nullable().optional(),
  priceInCents: z.number().int().min(0).max(1000000).nullable().optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),
  allowAnonymousView: z.boolean().nullable().optional(),
  requireEmailVerification: z.boolean().nullable().optional(),
  listed: z.boolean().nullable().optional(),
  
  // Scoreboard overrides
  scoreboardHomeTeam: z.string().max(100).nullable().optional(),
  scoreboardAwayTeam: z.string().max(100).nullable().optional(),
  scoreboardHomeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  scoreboardAwayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

/**
 * List DirectStreamEvents Query Schema
 */
export const ListDirectStreamEventsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'deleted', 'all']).optional().default('active'),
  upcoming: z.boolean().optional(), // Only show future events
  sortBy: z.enum(['scheduledStartAt', 'createdAt', 'title']).optional().default('scheduledStartAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Get Event Bootstrap Query Schema
 * 
 * For public endpoint: /api/public/direct/:slug/events/:eventSlug/bootstrap
 */
export const GetEventBootstrapSchema = z.object({
  slug: z.string(),
  eventSlug: z.string(),
});

export type CreateDirectStreamEventInput = z.infer<typeof CreateDirectStreamEventSchema>;
export type UpdateDirectStreamEventInput = z.infer<typeof UpdateDirectStreamEventSchema>;
export type ListDirectStreamEventsQuery = z.infer<typeof ListDirectStreamEventsQuerySchema>;
export type GetEventBootstrapQuery = z.infer<typeof GetEventBootstrapSchema>;

