/**
 * Streaming Service Interfaces (ISP)
 * 
 * Segregated interfaces for streaming operations.
 */

import type { StreamSource } from '@prisma/client';

export interface MuxStreamConfig {
  rtmpPublishUrl: string;
  streamKey: string;
  playbackId: string;
  muxStreamId: string;
}

export interface RtmpConfig {
  rtmpUrl: string;
  streamKey: string;
  playbackId: string;
  muxStreamId: string;
}

/**
 * Reader Interface (ISP)
 */
export interface IStreamingReader {
  getStreamSource(gameId: string): Promise<StreamSource | null>;
}

/**
 * Writer Interface (ISP)
 */
export interface IStreamingWriter {
  createMuxStream(gameId: string): Promise<MuxStreamConfig>;
  configureByoHls(gameId: string, manifestUrl: string): Promise<StreamSource>;
  configureByoRtmp(gameId: string, rtmpUrl?: string): Promise<RtmpConfig>;
  configureExternalEmbed(
    gameId: string,
    embedUrl: string,
    provider: 'youtube' | 'twitch' | 'vimeo' | 'other'
  ): Promise<StreamSource>;
}
