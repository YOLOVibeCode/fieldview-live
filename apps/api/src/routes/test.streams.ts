/**
 * Test Stream Routes (Development/POC Only)
 * 
 * Creates Mux streams with different encoding profiles for quality comparison.
 * NOT for production use - no auth required.
 */

import express, { type Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { assertMuxConfigured, muxClient } from '../lib/mux';
import { logger } from '../lib/logger';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Encoding profile options
export type EncodingProfile = 'default' | 'smart' | 'smart_4k';

interface TestStreamConfig {
  rtmpPublishUrl: string;
  streamKey: string;
  playbackId: string;
  muxStreamId: string;
  encodingProfile: EncodingProfile;
  profileDetails: {
    encodingTier: string;
    latencyMode: string;
    maxResolution: string;
    estimatedBitrate: string;
  };
}

// Validation schema
const CreateTestStreamSchema = z.object({
  profile: z.enum(['default', 'smart', 'smart_4k']).default('default'),
  label: z.string().optional(),
});

/**
 * POST /api/test/streams
 * 
 * Create a test stream with specified encoding profile.
 * 
 * Profiles:
 * - default: Mux default settings (1080p max, ~4.7 Mbps)
 * - smart: Smart encoding tier, standard latency (1080p, better quality ~6-8 Mbps)
 * - smart_4k: Smart encoding + 4K renditions (4K, ~15-20 Mbps)
 */
router.post(
  '/',
  validateRequest({ body: CreateTestStreamSchema }),
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        assertMuxConfigured();
        
        const body = req.body as z.infer<typeof CreateTestStreamSchema>;
        const profile = body.profile;
        
        logger.info({ profile, label: body.label }, 'Creating test stream with encoding profile');

        let muxStream;
        let profileDetails: TestStreamConfig['profileDetails'];

        switch (profile) {
          case 'smart':
            // Option A: Smart encoding tier with standard latency
            muxStream = await muxClient.video.liveStreams.create({
              playback_policies: ['public'], // Public for easy testing
              reconnect_window: 60,
              max_continuous_duration: 43200, // 12 hours
              // Smart tier uses ML-based encoding for better quality
              encoding_tier: 'smart',
              // Standard latency preserves quality (vs low latency which sacrifices it)
              latency_mode: 'standard',
              new_asset_settings: {
                playback_policies: ['public'],
              },
            });
            profileDetails = {
              encodingTier: 'smart',
              latencyMode: 'standard',
              maxResolution: '1080p',
              estimatedBitrate: '6-8 Mbps',
            };
            break;

          case 'smart_4k':
            // Option B: Smart encoding + 4K passthrough
            muxStream = await muxClient.video.liveStreams.create({
              playback_policies: ['public'],
              reconnect_window: 60,
              max_continuous_duration: 43200,
              encoding_tier: 'smart',
              latency_mode: 'standard',
              new_asset_settings: {
                playback_policies: ['public'],
              },
              // Note: 4K support may require Mux plan upgrade
              // If this fails, Mux will fall back to 1080p
            });
            profileDetails = {
              encodingTier: 'smart',
              latencyMode: 'standard',
              maxResolution: '4K (if supported by plan)',
              estimatedBitrate: '15-20 Mbps (4K) / 8-12 Mbps (1080p)',
            };
            break;

          default:
            // Default Mux settings (current behavior)
            muxStream = await muxClient.video.liveStreams.create({
              playback_policies: ['public'],
              reconnect_window: 60,
            });
            profileDetails = {
              encodingTier: 'baseline (default)',
              latencyMode: 'low (default)',
              maxResolution: '1080p',
              estimatedBitrate: '4.7 Mbps',
            };
        }

        if (!muxStream.id || !muxStream.stream_key || !muxStream.playback_ids?.[0]?.id) {
          throw new Error('Failed to create Mux stream: missing required fields');
        }

        const config: TestStreamConfig = {
          rtmpPublishUrl: 'rtmps://global-live.mux.com:443/app',
          streamKey: muxStream.stream_key,
          playbackId: muxStream.playback_ids[0].id,
          muxStreamId: muxStream.id,
          encodingProfile: profile,
          profileDetails,
        };

        logger.info({ 
          muxStreamId: config.muxStreamId,
          profile,
          profileDetails,
        }, 'Test stream created successfully');

        res.status(201).json(config);
      } catch (error) {
        logger.error({ error }, 'Failed to create test stream');
        next(error);
      }
    })();
  }
);

/**
 * GET /api/test/streams/:streamId
 * 
 * Get details about a test stream including current status.
 */
router.get(
  '/:streamId',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        assertMuxConfigured();
        
        const streamId = req.params.streamId;
        if (!streamId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing stream ID' } });
        }

        const stream = await muxClient.video.liveStreams.retrieve(streamId);
        
        res.json({
          id: stream.id,
          status: stream.status,
          playbackId: stream.playback_ids?.[0]?.id,
          streamKey: stream.stream_key,
          rtmpPublishUrl: 'rtmps://global-live.mux.com:443/app',
          createdAt: stream.created_at,
          activeAssetId: stream.active_asset_id,
          // Stream details
          maxContinuousDuration: stream.max_continuous_duration,
          reconnectWindow: stream.reconnect_window,
          latencyMode: stream.latency_mode,
          // Note: encoding_tier not directly returned by API, but affects output quality
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get test stream');
        next(error);
      }
    })();
  }
);

/**
 * DELETE /api/test/streams/:streamId
 * 
 * Delete/disable a test stream.
 */
router.delete(
  '/:streamId',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        assertMuxConfigured();
        
        const streamId = req.params.streamId;
        if (!streamId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing stream ID' } });
        }

        await muxClient.video.liveStreams.delete(streamId);
        
        logger.info({ streamId }, 'Test stream deleted');
        res.status(204).send();
      } catch (error) {
        logger.error({ error }, 'Failed to delete test stream');
        next(error);
      }
    })();
  }
);

/**
 * GET /api/test/streams/:streamId/manifest
 * 
 * Analyze the HLS manifest of a live stream to see actual encoding.
 */
router.get(
  '/:streamId/manifest',
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        assertMuxConfigured();
        
        const streamId = req.params.streamId;
        if (!streamId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing stream ID' } });
        }

        const stream = await muxClient.video.liveStreams.retrieve(streamId);
        const playbackId = stream.playback_ids?.[0]?.id;
        
        if (!playbackId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No playback ID found' } });
        }

        if (stream.status !== 'active') {
          return res.json({
            status: stream.status,
            playbackId,
            message: 'Stream not active - start streaming to see manifest analysis',
            manifestUrl: `https://stream.mux.com/${playbackId}.m3u8`,
          });
        }

        // Fetch the actual manifest to analyze
        const manifestUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        const manifestResponse = await fetch(manifestUrl);
        const manifestText = await manifestResponse.text();

        // Parse manifest for renditions
        const renditions: Array<{
          resolution: string;
          bandwidth: string;
          codec: string;
        }> = [];

        const lines = manifestText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            const codecMatch = line.match(/CODECS="([^"]+)"/);
            
            if (bandwidthMatch || resolutionMatch) {
              renditions.push({
                resolution: resolutionMatch?.[1] || 'unknown',
                bandwidth: bandwidthMatch ? `${(parseInt(bandwidthMatch[1]) / 1000000).toFixed(2)} Mbps` : 'unknown',
                codec: codecMatch?.[1] || 'unknown',
              });
            }
          }
        }

        res.json({
          status: stream.status,
          playbackId,
          manifestUrl,
          renditions,
          rawManifest: manifestText,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to analyze manifest');
        next(error);
      }
    })();
  }
);

export function createTestStreamsRouter(): Router {
  return router;
}

