/**
 * Event Schemas
 *
 * Validation for Event creation and updates.
 */

import { z } from 'zod';

export const EventStateSchema = z.enum(['scheduled', 'live', 'ended', 'cancelled']);

export const EventStreamTypeSchema = z.enum(['mux_playback', 'byo_hls', 'external_embed']);

export const EventAccessModeSchema = z.enum(['public_free', 'pay_per_view']);

export const UrlKeySchema = z
  .string()
  .min(10)
  .max(32)
  .regex(/^[0-9]{10,14}(-[0-9]+)?$/, 'URL key must be YYYYMMDDHHmm format with optional suffix');

export const CanonicalPathSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^\/[A-Za-z0-9][A-Za-z0-9_/-]*$/, 'Canonical path must be a valid URL path');

export const CreateEventSchema = z.object({
  organizationId: z.string().uuid(),
  channelId: z.string().uuid(),
  startsAt: z.coerce.date(),
  urlKey: UrlKeySchema.optional(), // Auto-generated if not provided
  canonicalPath: CanonicalPathSchema.optional(), // Auto-generated if not provided
  streamType: EventStreamTypeSchema.optional(),
  muxPlaybackId: z.string().min(1).optional(),
  hlsManifestUrl: z.string().url().optional(),
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  accessMode: EventAccessModeSchema.optional(),
  priceCents: z.number().int().positive().optional(),
  currency: z.string().length(3).default('USD'),
});

export const UpdateEventSchema = z.object({
  startsAt: z.coerce.date().optional(),
  state: EventStateSchema.optional(),
  streamType: EventStreamTypeSchema.optional(),
  muxPlaybackId: z.string().min(1).optional(),
  hlsManifestUrl: z.string().url().optional(),
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  accessMode: EventAccessModeSchema.optional(),
  priceCents: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

export const ListEventsQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  state: EventStateSchema.optional(),
  startsAfter: z.coerce.date().optional(),
  startsBefore: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});


