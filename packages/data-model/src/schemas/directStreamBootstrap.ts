/**
 * DirectStream Bootstrap Schemas
 * 
 * ISP (Interface Segregation Principle):
 * - Separate page config from stream config
 * - Clients only depend on what they need
 * - Page can load without stream
 * - Stream can be managed independently
 */

import { z } from 'zod';

/**
 * Page Configuration Schema
 * 
 * Contains all settings related to the page/venue itself.
 * Independent of stream availability.
 */
export const DirectStreamPageConfigSchema = z.object({
  slug: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  gameId: z.string().uuid().nullable(),
  
  // Feature flags
  chatEnabled: z.boolean(),
  scoreboardEnabled: z.boolean(),
  
  // Paywall settings
  paywallEnabled: z.boolean(),
  priceInCents: z.number().int().min(0).max(99999),
  paywallMessage: z.string().max(1000).nullable(),
  allowSavePayment: z.boolean(),
  
  // Scoreboard preferences
  scoreboardHomeTeam: z.string().nullable(),
  scoreboardAwayTeam: z.string().nullable(),
  scoreboardHomeColor: z.string().nullable(),
  scoreboardAwayColor: z.string().nullable(),
  
  // Viewer permissions
  allowViewerScoreEdit: z.boolean(),
  allowViewerNameEdit: z.boolean(),
});

/**
 * Stream Configuration Schema
 * 
 * Contains all settings related to the media stream.
 * Can be null if stream is not configured.
 */
export const DirectStreamStreamConfigSchema = z.object({
  status: z.enum(['live', 'offline', 'scheduled', 'error']),
  url: z.string().url().nullable(),
  type: z.enum(['hls', 'rtmp', 'embed']).nullable(),
  errorMessage: z.string().nullable(),
});

/**
 * Bootstrap Response Schema
 * 
 * Combines page and stream configs.
 * Maintains backward compatibility with flat structure.
 */
export const DirectStreamBootstrapResponseSchema = z.object({
  // ISP: Segregated interfaces
  page: DirectStreamPageConfigSchema,
  stream: DirectStreamStreamConfigSchema.nullable(),
  
  // Backward compatibility: flat fields for old clients
  slug: z.string(),
  title: z.string(),
  gameId: z.string().uuid().nullable(),
  streamUrl: z.string().url().nullable(),
  chatEnabled: z.boolean(),
  scoreboardEnabled: z.boolean(),
  paywallEnabled: z.boolean(),
  priceInCents: z.number().int().min(0),
  paywallMessage: z.string().nullable(),
  allowSavePayment: z.boolean(),
  scoreboardHomeTeam: z.string().nullable(),
  scoreboardAwayTeam: z.string().nullable(),
  scoreboardHomeColor: z.string().nullable(),
  scoreboardAwayColor: z.string().nullable(),
  allowViewerScoreEdit: z.boolean(),
  allowViewerNameEdit: z.boolean(),
});

/**
 * Settings Update Schema
 * 
 * ISP: All fields are optional.
 * Clients only send what they want to update.
 */
export const DirectStreamSettingsUpdateSchema = z.object({
  // Stream settings (optional, can be omitted)
  streamUrl: z.string().url().nullable().optional(),
  
  // Page settings (all optional)
  chatEnabled: z.boolean().optional(),
  scoreboardEnabled: z.boolean().optional(),
  paywallEnabled: z.boolean().optional(),
  priceInCents: z.number().int().min(0).max(99999).optional(),
  paywallMessage: z.string().max(1000).nullable().optional(),
  allowSavePayment: z.boolean().optional(),
  
  // Scoreboard settings (optional)
  scoreboardHomeTeam: z.string().nullable().optional(),
  scoreboardAwayTeam: z.string().nullable().optional(),
  scoreboardHomeColor: z.string().nullable().optional(),
  scoreboardAwayColor: z.string().nullable().optional(),
  
  // Viewer permissions (optional)
  allowViewerScoreEdit: z.boolean().optional(),
  allowViewerNameEdit: z.boolean().optional(),
}).strict();  // Reject unknown fields

// Export types
export type DirectStreamPageConfig = z.infer<typeof DirectStreamPageConfigSchema>;
export type DirectStreamStreamConfig = z.infer<typeof DirectStreamStreamConfigSchema>;
export type DirectStreamBootstrapResponse = z.infer<typeof DirectStreamBootstrapResponseSchema>;
export type DirectStreamSettingsUpdate = z.infer<typeof DirectStreamSettingsUpdateSchema>;

/**
 * Helper: Validate stream URL without throwing
 * Returns true if valid, false otherwise
 */
export function isValidStreamUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Determine stream status from DirectStream entity
 */
export function getStreamStatus(streamUrl: string | null): DirectStreamStreamConfig | null {
  if (!streamUrl) {
    return null;
  }
  
  if (!isValidStreamUrl(streamUrl)) {
    return {
      status: 'error',
      url: null,
      type: null,
      errorMessage: 'Invalid stream URL format',
    };
  }
  
  // Determine stream type from URL
  let type: 'hls' | 'rtmp' | 'embed' = 'hls';
  if (streamUrl.includes('youtube.com') || streamUrl.includes('twitch.tv')) {
    type = 'embed';
  } else if (streamUrl.startsWith('rtmp://') || streamUrl.startsWith('rtmps://')) {
    type = 'rtmp';
  }
  
  return {
    status: 'live',  // TODO: Add actual health check
    url: streamUrl,
    type,
    errorMessage: null,
  };
}
