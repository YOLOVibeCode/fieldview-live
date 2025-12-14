/**
 * Streaming Service Implementation
 * 
 * Implements IStreamingReader and IStreamingWriter.
 * Handles stream source configuration for all stream types.
 */

import type { StreamSource } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../lib/errors';
import { muxClient } from '../lib/mux';
import type { IGameReader, IGameWriter } from '../repositories/IGameRepository';
import type {
  IStreamSourceReader,
  IStreamSourceWriter,
} from '../repositories/IStreamSourceRepository';
import type {
  IStreamingReader,
  IStreamingWriter,
  MuxStreamConfig,
  RtmpConfig,
} from './IStreamingService';

export class StreamingService implements IStreamingReader, IStreamingWriter {
  constructor(
    private streamSourceReader: IStreamSourceReader,
    private streamSourceWriter: IStreamSourceWriter,
    private gameReader: IGameReader,
    private gameWriter: IGameWriter
  ) {}

  async getStreamSource(gameId: string) {
    return this.streamSourceReader.getByGameId(gameId);
  }

  async createMuxStream(gameId: string): Promise<MuxStreamConfig> {
    // Verify game exists
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Check if stream source already exists
    const existing = await this.streamSourceReader.getByGameId(gameId);
    if (existing) {
      throw new BadRequestError('Stream source already exists for this game');
    }

    // Create Mux live stream
    const muxStream = await muxClient.video.liveStreams.create({
      playback_policies: ['signed'], // Signed URLs required for protection
      reconnect_window: 60,
    });

    if (!muxStream.id || !muxStream.stream_key || !muxStream.playback_ids?.[0]?.id) {
      throw new Error('Failed to create Mux stream: missing required fields');
    }

    const playbackId = muxStream.playback_ids[0].id;
    const streamKey = muxStream.stream_key;
    const muxStreamId = muxStream.id;

    // Get RTMP publish URL (Mux standard format)
    const rtmpPublishUrl = `rtmp://global-live.mux.com:443/app/${streamKey}`;

    // Store in database
    const streamSource = await this.streamSourceWriter.create({
      gameId,
      type: 'mux_managed',
      protectionLevel: 'strong',
      muxAssetId: muxStreamId, // Store stream ID as asset ID for now
      muxPlaybackId: playbackId,
    });

    // Update game with stream source ID
    await this.gameWriter.update(gameId, { streamSourceId: streamSource.id });

    return {
      rtmpPublishUrl,
      streamKey,
      playbackId,
      muxStreamId,
    };
  }

  async configureByoHls(gameId: string, manifestUrl: string): Promise<StreamSource> {
    // Verify game exists
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Validate URL format
    try {
      new URL(manifestUrl);
    } catch {
      throw new BadRequestError('Invalid manifest URL format');
    }

    // Check if stream source already exists
    const existing = await this.streamSourceReader.getByGameId(gameId);
    if (existing) {
      // Update existing
      return this.streamSourceWriter.update(existing.id, {
        type: 'byo_hls',
        protectionLevel: 'moderate',
        hlsManifestUrl: manifestUrl,
        // Clear other type-specific fields
        muxAssetId: null,
        muxPlaybackId: null,
        rtmpPublishUrl: null,
        rtmpStreamKey: null,
        externalEmbedUrl: null,
        externalProvider: null,
      });
    }

    // Create new
    const streamSource = await this.streamSourceWriter.create({
      gameId,
      type: 'byo_hls',
      protectionLevel: 'moderate',
      hlsManifestUrl: manifestUrl,
    });

    // Update game with stream source ID
    await this.gameWriter.update(gameId, { streamSourceId: streamSource.id });

    return streamSource;
  }

  async configureByoRtmp(gameId: string, rtmpUrl?: string): Promise<RtmpConfig> {
    // Verify game exists
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Create Mux live stream for RTMP ingest
    const muxStream = await muxClient.video.liveStreams.create({
      playback_policies: ['signed'], // Signed URLs required for protection
      reconnect_window: 60,
    });

    if (!muxStream.id || !muxStream.stream_key || !muxStream.playback_ids?.[0]?.id) {
      throw new Error('Failed to create Mux stream: missing required fields');
    }

    const playbackId = muxStream.playback_ids[0].id;
    const streamKey = muxStream.stream_key;
    const muxStreamId = muxStream.id;

    // Use provided RTMP URL or Mux standard format
    const finalRtmpUrl = rtmpUrl || `rtmp://global-live.mux.com:443/app/${streamKey}`;

    // Check if stream source already exists
    const existing = await this.streamSourceReader.getByGameId(gameId);
    if (existing) {
      // Update existing
      await this.streamSourceWriter.update(existing.id, {
        type: 'byo_rtmp',
        protectionLevel: 'strong',
        rtmpPublishUrl: finalRtmpUrl,
        rtmpStreamKey: streamKey, // Store encrypted (in production, encrypt this)
        muxPlaybackId: playbackId,
        muxAssetId: muxStreamId,
        // Clear other type-specific fields
        hlsManifestUrl: null,
        externalEmbedUrl: null,
        externalProvider: null,
      });
    } else {
      // Create new
      const streamSource = await this.streamSourceWriter.create({
        gameId,
        type: 'byo_rtmp',
        protectionLevel: 'strong',
        rtmpPublishUrl: finalRtmpUrl,
        rtmpStreamKey: streamKey, // Store encrypted (in production, encrypt this)
        muxPlaybackId: playbackId,
        muxAssetId: muxStreamId,
      });

      // Update game with stream source ID
      await this.gameWriter.update(gameId, { streamSourceId: streamSource.id });
    }

    return {
      rtmpUrl: finalRtmpUrl,
      streamKey,
      playbackId,
      muxStreamId,
    };
  }

  async configureExternalEmbed(
    gameId: string,
    embedUrl: string,
    provider: 'youtube' | 'twitch' | 'vimeo' | 'other'
  ): Promise<StreamSource> {
    // Verify game exists
    const game = await this.gameReader.getById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Validate URL format
    try {
      new URL(embedUrl);
    } catch {
      throw new BadRequestError('Invalid embed URL format');
    }

    // Check if stream source already exists
    const existing = await this.streamSourceReader.getByGameId(gameId);
    if (existing) {
      // Update existing
      return this.streamSourceWriter.update(existing.id, {
        type: 'external_embed',
        protectionLevel: 'best_effort',
        externalEmbedUrl: embedUrl,
        externalProvider: provider,
        // Clear other type-specific fields
        muxAssetId: null,
        muxPlaybackId: null,
        hlsManifestUrl: null,
        rtmpPublishUrl: null,
        rtmpStreamKey: null,
      });
    }

    // Create new
    const streamSource = await this.streamSourceWriter.create({
      gameId,
      type: 'external_embed',
      protectionLevel: 'best_effort',
      externalEmbedUrl: embedUrl,
      externalProvider: provider,
    });

    // Update game with stream source ID
    await this.gameWriter.update(gameId, { streamSourceId: streamSource.id });

    return streamSource;
  }
}
