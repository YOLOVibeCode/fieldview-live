/**
 * StreamSource Entity
 * 
 * Supports monetizing "any media stream":
 * - Mux-managed (preferred, strong protection)
 * - BYO HLS (moderate protection)
 * - BYO RTMP (routes to Mux, strong protection)
 * - External embed (best-effort protection)
 */

export type StreamSourceType = 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed';

export type ProtectionLevel = 'strong' | 'moderate' | 'best_effort';

export interface StreamSource {
  id: string;
  gameId: string;
  type: StreamSourceType;
  protectionLevel: ProtectionLevel;
  
  // Mux-managed
  muxAssetId?: string;
  muxPlaybackId?: string;
  
  // BYO HLS
  hlsManifestUrl?: string;
  
  // BYO RTMP
  rtmpPublishUrl?: string;
  rtmpStreamKey?: string; // Encrypted
  
  // External embed
  externalEmbedUrl?: string;
  externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other';
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Protection level mapping per stream source type
 */
export const STREAM_SOURCE_PROTECTION: Record<StreamSourceType, ProtectionLevel> = {
  mux_managed: 'strong',
  byo_rtmp: 'strong', // Routes to Mux, same protection
  byo_hls: 'moderate', // Depends on proxy/signing
  external_embed: 'best_effort', // Limited protection
};
