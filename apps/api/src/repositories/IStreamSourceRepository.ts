/**
 * Stream Source Repository Interfaces (ISP)
 * 
 * Segregated interfaces for StreamSource operations.
 */

import type { StreamSource } from '@prisma/client';

export interface CreateStreamSourceData {
  gameId: string;
  type: 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed';
  protectionLevel: 'strong' | 'moderate' | 'best_effort';
  // Mux-managed
  muxAssetId?: string;
  muxPlaybackId?: string;
  // BYO HLS
  hlsManifestUrl?: string;
  // BYO RTMP
  rtmpPublishUrl?: string;
  rtmpStreamKey?: string;
  // External embed
  externalEmbedUrl?: string;
  externalProvider?: string;
}

export interface UpdateStreamSourceData {
  type?: 'mux_managed' | 'byo_hls' | 'byo_rtmp' | 'external_embed';
  protectionLevel?: 'strong' | 'moderate' | 'best_effort';
  muxAssetId?: string | null;
  muxPlaybackId?: string | null;
  hlsManifestUrl?: string | null;
  rtmpPublishUrl?: string | null;
  rtmpStreamKey?: string | null;
  externalEmbedUrl?: string | null;
  externalProvider?: string | null;
}

/**
 * Reader Interface (ISP)
 */
export interface IStreamSourceReader {
  getByGameId(gameId: string): Promise<StreamSource | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface IStreamSourceWriter {
  create(data: CreateStreamSourceData): Promise<StreamSource>;
  update(id: string, data: UpdateStreamSourceData): Promise<StreamSource>;
  delete(id: string): Promise<void>;
}
