/**
 * DirectStream TypeScript Types
 * 
 * ISP-compliant types for frontend consumption.
 * Mirrors backend schemas for type safety.
 */

/**
 * Page Configuration
 * 
 * All settings related to the page/venue.
 * Independent of stream availability.
 */
export interface DirectStreamPageConfig {
  slug: string;
  title: string;
  gameId: string | null;
  
  // Feature flags
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  
  // Paywall settings
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage: string | null;
  allowSavePayment: boolean;
  
  // Scoreboard preferences
  scoreboardHomeTeam: string | null;
  scoreboardAwayTeam: string | null;
  scoreboardHomeColor: string | null;
  scoreboardAwayColor: string | null;
  
  // Viewer permissions
  allowViewerScoreEdit: boolean;
  allowViewerNameEdit: boolean;
}

/**
 * Stream Configuration
 * 
 * All settings related to the media stream.
 * Null when stream is not configured.
 */
export interface DirectStreamStreamConfig {
  status: 'live' | 'offline' | 'scheduled' | 'error';
  url: string | null;
  type: 'hls' | 'rtmp' | 'embed' | null;
  errorMessage: string | null;

  // Stream provider metadata (for player selection)
  provider: 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed' | 'unknown' | null;
  muxPlaybackId: string | null;
  protectionLevel: 'strong' | 'moderate' | 'best_effort' | 'none' | null;
}

/**
 * Bootstrap Response
 * 
 * ISP: Segregated page and stream configs.
 * Backward compatible with flat structure.
 */
export interface DirectStreamBootstrapResponse {
  // ISP: Segregated interfaces
  page: DirectStreamPageConfig;
  stream: DirectStreamStreamConfig | null;
  
  // Backward compatibility: flat fields
  slug: string;
  title: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage: string | null;
  allowSavePayment: boolean;
  scoreboardHomeTeam: string | null;
  scoreboardAwayTeam: string | null;
  scoreboardHomeColor: string | null;
  scoreboardAwayColor: string | null;
  allowViewerScoreEdit: boolean;
  allowViewerNameEdit: boolean;

  // Stream provider metadata (flat, for player selection)
  streamProvider: 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed' | 'unknown' | null;
  muxPlaybackId: string | null;
  protectionLevel: 'strong' | 'moderate' | 'best_effort' | 'none' | null;
}

/**
 * Helper: Get user-friendly message for stream status
 */
export function getStreamStatusMessage(stream: DirectStreamStreamConfig | null): string {
  if (!stream) {
    return 'No stream configured. Admin can set stream URL.';
  }
  
  switch (stream.status) {
    case 'live':
      return 'Stream is live';
    case 'offline':
      return 'Stream is currently offline. Check back later.';
    case 'scheduled':
      return 'Stream starts soon. Stay tuned!';
    case 'error':
      return stream.errorMessage || 'Stream error occurred';
    default:
      return 'Stream status unknown';
  }
}

/**
 * Helper: Check if stream is playable
 */
export function isStreamPlayable(stream: DirectStreamStreamConfig | null): boolean {
  return stream?.status === 'live' && !!stream.url;
}
