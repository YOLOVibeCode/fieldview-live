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

export const CreateWatchChannelSchema = z.object({
  teamSlug: TeamSlugSchema,
  displayName: z.string().min(1).max(120),
  requireEventCode: z.boolean().optional(),
  streamType: WatchChannelStreamTypeSchema,
  muxPlaybackId: z.string().min(1).optional(),
  hlsManifestUrl: z.string().url().optional(),
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
});

export const CreateWatchEventCodeSchema = z.object({
  code: EventCodeSchema,
});


