import { z } from 'zod';

import type { StreamSource } from '../entities/StreamSource';

export const StreamSourceTypeSchema = z.enum(['mux_managed', 'byo_hls', 'byo_rtmp', 'external_embed']);

export const ProtectionLevelSchema = z.enum(['strong', 'moderate', 'best_effort']);

/**
 * StreamSource Zod Schema
 * 
 * Validates stream source configuration with type-specific fields.
 */
export const StreamSourceSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  type: StreamSourceTypeSchema,
  protectionLevel: ProtectionLevelSchema,
  
  muxAssetId: z.string().optional(),
  muxPlaybackId: z.string().optional(),
  
  hlsManifestUrl: z.string().url().optional(),
  
  rtmpPublishUrl: z.string().url().optional(),
  rtmpStreamKey: z.string().optional(),
  
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine((data) => {
  // Validate type-specific required fields
  if (data.type === 'mux_managed' && !data.muxAssetId) return false;
  if (data.type === 'byo_hls' && !data.hlsManifestUrl) return false;
  if (data.type === 'byo_rtmp' && (!data.rtmpPublishUrl || !data.rtmpStreamKey)) return false;
  if (data.type === 'external_embed' && !data.externalEmbedUrl) return false;
  return true;
}, {
  message: 'StreamSource type-specific fields are required',
}) satisfies z.ZodType<StreamSource>;
