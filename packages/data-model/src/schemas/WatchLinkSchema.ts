/**
 * Watch Link Schemas
 *
 * Shared validation for org/team watch link inputs.
 */

import { z } from 'zod';

export const OrgShortNameSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/, 'Org short name must be uppercase alphanumeric');

export const TeamSlugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Team slug must be URL-safe');

export const EventCodeSchema = z
  .string()
  .min(4)
  .max(32)
  .regex(/^[A-Za-z0-9]+$/, 'Event code must be alphanumeric');

export const WatchChannelStreamTypeSchema = z.enum(['mux_playback', 'byo_hls', 'external_embed']);

export const WatchChannelAccessModeSchema = z.enum(['public_free', 'pay_per_view']);

export const UpdateWatchChannelStreamSchema = z.object({
  streamType: WatchChannelStreamTypeSchema,
  muxPlaybackId: z.string().min(1).optional(),
  hlsManifestUrl: z.string().url().optional(),
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  requireEventCode: z.boolean().optional(),
});

export const CreateWatchOrgSchema = z.object({
  shortName: OrgShortNameSchema,
  name: z.string().min(1).max(120),
});

export const CreateWatchChannelSchema = z
  .object({
    teamSlug: TeamSlugSchema,
    displayName: z.string().min(1).max(120),
    accessMode: WatchChannelAccessModeSchema.default('public_free'),
    priceCents: z.number().int().min(0).optional(),
    currency: z.string().length(3).default('USD').optional(),
    requireEventCode: z.boolean().optional(),
    streamType: WatchChannelStreamTypeSchema,
    muxPlaybackId: z.string().min(1).optional(),
    hlsManifestUrl: z.string().url().optional(),
    externalEmbedUrl: z.string().url().optional(),
    externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  })
  .refine(
    (data) => {
      if (data.accessMode === 'pay_per_view') {
        return data.priceCents !== undefined && data.priceCents > 0;
      }
      return true;
    },
    { message: 'priceCents is required when accessMode is pay_per_view', path: ['priceCents'] }
  );

export const UpdateWatchChannelSchema = z
  .object({
    displayName: z.string().min(1).max(120).optional(),
    accessMode: WatchChannelAccessModeSchema.optional(),
    priceCents: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
    requireEventCode: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.accessMode === 'pay_per_view') {
        // When switching to pay_per_view, allow sending both fields at once.
        return data.priceCents === undefined || data.priceCents > 0;
      }
      return true;
    },
    { message: 'priceCents must be > 0 when accessMode is pay_per_view', path: ['priceCents'] }
  );

export const CreateWatchEventCodeSchema = z.object({
  code: EventCodeSchema,
});


