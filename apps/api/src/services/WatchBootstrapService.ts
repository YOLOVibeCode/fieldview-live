/**
 * Watch Bootstrap Service Implementation
 * 
 * Implements IWatchBootstrapReader.
 * Handles watch bootstrap generation with stream URL and player config.
 */

import { NotFoundError, UnauthorizedError } from '../lib/errors';
import type { IGameReader } from '../repositories/IGameRepository';
import type { IPurchaseReader } from '../repositories/IPurchaseRepository';
import type { IStreamSourceReader } from '../repositories/IStreamSourceRepository';

import type { IEntitlementReader } from './IEntitlementService';
import type { IWatchBootstrapReader, WatchBootstrapResponse } from './IWatchBootstrapService';

const MUX_DOMAIN = process.env.MUX_DOMAIN || 'mux.com';

export class WatchBootstrapService implements IWatchBootstrapReader {
  constructor(
    private entitlementReader: IEntitlementReader,
    private gameReader: IGameReader,
    private purchaseReader: IPurchaseReader,
    private streamSourceReader: IStreamSourceReader
  ) {}

  async getBootstrap(tokenId: string): Promise<WatchBootstrapResponse> {
    // Validate token
    const validation = await this.entitlementReader.validateToken(tokenId);
    if (!validation.valid || !validation.entitlement) {
      throw new UnauthorizedError(validation.error || 'Invalid or expired token');
    }

    const entitlement = validation.entitlement;

    // Get purchase to get gameId
    const purchase = await this.purchaseReader.getById(entitlement.purchaseId);
    if (!purchase) {
      throw new NotFoundError('Purchase not found');
    }

    // Get game
    const game = await this.gameReader.getById(purchase.gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    // Get stream source
    const streamSource = game.streamSourceId
      ? await this.streamSourceReader.getByGameId(game.id)
      : null;

    // Determine game state
    const now = new Date();
    let state: WatchBootstrapResponse['state'] = 'unavailable';

    if (game.state === 'cancelled') {
      state = 'unavailable';
    } else if (game.state === 'ended') {
      state = 'ended';
    } else if (game.state === 'live') {
      state = 'live';
    } else if (game.state === 'active' && game.startsAt <= now) {
      state = 'live';
    } else if (game.state === 'active' && game.startsAt > now) {
      state = 'not_started';
    } else {
      state = 'unavailable';
    }

    // Determine stream URL and player type based on stream source
    let streamUrl = '';
    let playerType: 'hls' | 'embed' = 'hls';
    let protectionLevel: 'strong' | 'moderate' | 'best_effort' = 'best_effort';

    if (streamSource) {
      protectionLevel = streamSource.protectionLevel as 'strong' | 'moderate' | 'best_effort';

      switch (streamSource.type) {
        case 'mux_managed':
          // Mux-managed stream - use Mux playback URL
          if (streamSource.muxPlaybackId) {
            streamUrl = `https://stream.${MUX_DOMAIN}/${streamSource.muxPlaybackId}.m3u8`;
            playerType = 'hls';
          } else {
            streamUrl = '';
            state = 'unavailable';
          }
          break;

        case 'byo_hls':
          // BYO HLS - use provided manifest URL
          if (streamSource.hlsManifestUrl) {
            streamUrl = streamSource.hlsManifestUrl;
            playerType = 'hls';
          } else {
            streamUrl = '';
            state = 'unavailable';
          }
          break;

        case 'external_embed':
          // External embed (YouTube, Twitch, etc.)
          if (streamSource.externalEmbedUrl) {
            streamUrl = streamSource.externalEmbedUrl;
            playerType = 'embed';
          } else {
            streamUrl = '';
            state = 'unavailable';
          }
          break;

        case 'byo_rtmp':
          // BYO RTMP - RTMP is for publishing, not playback
          // In production, RTMP would be converted to HLS via Mux or similar
          // For now, mark as unavailable
          streamUrl = '';
          state = 'unavailable';
          break;

        default:
          streamUrl = '';
          state = 'unavailable';
      }
    } else {
      // No stream source configured
      streamUrl = '';
      state = 'unavailable';
    }

    return {
      streamUrl,
      playerType,
      state,
      validTo: entitlement.validTo.toISOString(),
      gameInfo: {
        title: game.title,
        startsAt: game.startsAt.toISOString(),
      },
      protectionLevel,
    };
  }
}
