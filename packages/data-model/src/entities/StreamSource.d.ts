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
    muxAssetId?: string;
    muxPlaybackId?: string;
    hlsManifestUrl?: string;
    rtmpPublishUrl?: string;
    rtmpStreamKey?: string;
    externalEmbedUrl?: string;
    externalProvider?: 'youtube' | 'twitch' | 'vimeo' | 'other';
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Protection level mapping per stream source type
 */
export declare const STREAM_SOURCE_PROTECTION: Record<StreamSourceType, ProtectionLevel>;
//# sourceMappingURL=StreamSource.d.ts.map