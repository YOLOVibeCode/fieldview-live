/**
 * Owner Stream Source Routes
 * 
 * Stream source configuration endpoints for authenticated owners.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { StreamSourceRepository } from '../repositories/implementations/StreamSourceRepository';
import { StreamingService } from '../services/StreamingService';

const router = express.Router();

// Lazy initialization
let streamingServiceInstance: StreamingService | null = null;

function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    const streamSourceRepo = new StreamSourceRepository(prisma);
    const gameRepo = new GameRepository(prisma);
    streamingServiceInstance = new StreamingService(
      streamSourceRepo,
      streamSourceRepo,
      gameRepo,
      gameRepo
    );
  }
  return streamingServiceInstance;
}

// Export for testing
export function setStreamingService(service: StreamingService): void {
  streamingServiceInstance = service;
}

// Validation schemas
const CreateMuxStreamSchema = z.object({});

const ConfigureByoHlsSchema = z.object({
  manifestUrl: z.string().url(),
});

const ConfigureByoRtmpSchema = z.object({
  rtmpUrl: z.string().url().optional(),
});

const ConfigureExternalEmbedSchema = z.object({
  embedUrl: z.string().url(),
  provider: z.enum(['youtube', 'twitch', 'vimeo', 'other']),
});

/**
 * POST /api/owners/me/games/:gameId/streams/mux
 * 
 * Create Mux-managed stream for a game.
 */
router.post(
  '/me/games/:gameId/streams/mux',
  requireOwnerAuth,
  validateRequest({ body: CreateMuxStreamSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.gameId;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing game ID' } });
        }

        const ownerAccountId = req.ownerAccountId;

        // Verify game ownership
        const gameRepo = new GameRepository(prisma);
        const game = await gameRepo.getById(gameId);
        if (!game || game.ownerAccountId !== ownerAccountId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
        }

        const streamingService = getStreamingService();
        const config = await streamingService.createMuxStream(gameId);

        res.status(201).json({
          rtmpPublishUrl: config.rtmpPublishUrl,
          streamKey: config.streamKey,
          playbackId: config.playbackId,
          muxStreamId: config.muxStreamId,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/games/:gameId/streams/byo-hls
 * 
 * Configure BYO HLS stream source.
 */
router.post(
  '/me/games/:gameId/streams/byo-hls',
  requireOwnerAuth,
  validateRequest({ body: ConfigureByoHlsSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.gameId;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing game ID' } });
        }

        const ownerAccountId = req.ownerAccountId;
        const body = req.body as z.infer<typeof ConfigureByoHlsSchema>;

        // Verify game ownership
        const gameRepo = new GameRepository(prisma);
        const game = await gameRepo.getById(gameId);
        if (!game || game.ownerAccountId !== ownerAccountId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
        }

        const streamingService = getStreamingService();
        const streamSource = await streamingService.configureByoHls(gameId, body.manifestUrl);

        res.status(201).json({
          id: streamSource.id,
          type: streamSource.type,
          protectionLevel: streamSource.protectionLevel,
          hlsManifestUrl: streamSource.hlsManifestUrl,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/games/:gameId/streams/byo-rtmp
 * 
 * Configure BYO RTMP stream source (routes to Mux).
 */
router.post(
  '/me/games/:gameId/streams/byo-rtmp',
  requireOwnerAuth,
  validateRequest({ body: ConfigureByoRtmpSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.gameId;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing game ID' } });
        }

        const ownerAccountId = req.ownerAccountId;
        const body = req.body as z.infer<typeof ConfigureByoRtmpSchema>;

        // Verify game ownership
        const gameRepo = new GameRepository(prisma);
        const game = await gameRepo.getById(gameId);
        if (!game || game.ownerAccountId !== ownerAccountId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
        }

        const streamingService = getStreamingService();
        const config = await streamingService.configureByoRtmp(gameId, body.rtmpUrl);

        res.status(201).json({
          rtmpUrl: config.rtmpUrl,
          streamKey: config.streamKey,
          playbackId: config.playbackId,
          muxStreamId: config.muxStreamId,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * POST /api/owners/me/games/:gameId/streams/external-embed
 * 
 * Configure external embed stream source (YouTube, Twitch, etc.).
 */
router.post(
  '/me/games/:gameId/streams/external-embed',
  requireOwnerAuth,
  validateRequest({ body: ConfigureExternalEmbedSchema }),
  (req: AuthRequest, res, next) => {
    void (async () => {
      try {
        if (!req.ownerAccountId) {
          return next(new Error('Owner account ID not found'));
        }

        const gameId = req.params.gameId;
        if (!gameId) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Missing game ID' } });
        }

        const ownerAccountId = req.ownerAccountId;
        const body = req.body as z.infer<typeof ConfigureExternalEmbedSchema>;

        // Verify game ownership
        const gameRepo = new GameRepository(prisma);
        const game = await gameRepo.getById(gameId);
        if (!game || game.ownerAccountId !== ownerAccountId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
        }

        const streamingService = getStreamingService();
        const streamSource = await streamingService.configureExternalEmbed(
          gameId,
          body.embedUrl,
          body.provider
        );

        res.status(201).json({
          id: streamSource.id,
          type: streamSource.type,
          protectionLevel: streamSource.protectionLevel,
          externalEmbedUrl: streamSource.externalEmbedUrl,
          externalProvider: streamSource.externalProvider,
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createOwnersStreamsRouter(): Router {
  return router;
}
