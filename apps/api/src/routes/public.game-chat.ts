/**
 * Public Game Chat Routes
 * 
 * SSE streaming + message sending for any game type.
 */

import express, { type Router, type Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validateRequest } from '../middleware/validation';
import {
  requireViewerAuth,
  requireGameMatch,
  requireViewerId,
  requireGameId,
  type ViewerAuthRequest,
} from '../middleware/viewer-auth';
import { ChatRepository } from '../repositories/implementations/ChatRepository';
import { ChatService } from '../services/ChatService';
import { getChatPubSub } from '../lib/chat-pubsub';
import { logger } from '../lib/logger';
import { verifyViewerToken } from '../lib/viewer-jwt';
import { UnauthorizedError } from '../lib/errors';

const router = express.Router();

// Lazy initialization
let chatServiceInstance: ChatService | null = null;

function getChatService(): ChatService {
  if (!chatServiceInstance) {
    const chatRepo = new ChatRepository(prisma);
    const pubsub = getChatPubSub();
    chatServiceInstance = new ChatService(chatRepo, pubsub);
  }
  return chatServiceInstance;
}

const SendMessageSchema = z.object({
  message: z.string().min(1).max(240),
});

/**
 * POST /api/public/games/:gameId/chat/messages
 * 
 * Send a new chat message (requires viewer auth).
 */
router.post(
  '/games/:gameId/chat/messages',
  requireViewerAuth,
  requireGameMatch,
  validateRequest({ body: SendMessageSchema }),
  (req: ViewerAuthRequest, res, next) => {
    void (async () => {
      try {
        const gameId = requireGameId(req);
        const viewerId = requireViewerId(req);
        const displayName = req.displayName!;
        const { message } = req.body as z.infer<typeof SendMessageSchema>;

        const chatService = getChatService();
        const result = await chatService.sendMessage({
          gameId,
          viewerId,
          displayName,
          message,
        });

        logger.info(
          { gameId, viewerId, messageId: result.message.id },
          'Chat message sent'
        );

        res.json(result.message);
      } catch (error) {
        next(error);
      }
    })();
  }
);

/**
 * GET /api/public/games/:gameId/chat/stream
 * 
 * SSE stream for real-time chat (requires viewer auth via query param).
 * Query param: ?token=<viewerToken>
 */
router.get(
  '/games/:gameId/chat/stream',
  (req: ViewerAuthRequest, res: Response, next) => {
    void (async () => {
      try {
        const { gameId } = req.params;
        const token = req.query.token as string | undefined;

        if (!gameId || !token) {
          throw new UnauthorizedError('Game ID and token required');
        }

        // Verify token and extract claims
        let claims;
        try {
          claims = verifyViewerToken(token);
        } catch (error) {
          throw new UnauthorizedError('Invalid or expired token');
        }

        // Verify token is for this game
        if (claims.gameId !== gameId) {
          throw new UnauthorizedError('Token not valid for this game');
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        logger.info(
          { gameId, viewerId: claims.viewerId },
          'Chat SSE connection established'
        );

        // Send initial snapshot
        const chatService = getChatService();
        const snapshot = await chatService.getGameSnapshot(gameId, 50);

        res.write(`event: chat_snapshot\n`);
        res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

        // Subscribe to new messages
        const pubsub = getChatPubSub();
        const unsubscribe = pubsub.subscribe(gameId, (msg) => {
          res.write(`event: chat_message\n`);
          res.write(`data: ${JSON.stringify(msg)}\n\n`);
        });

        // Keep connection alive with ping every 30s
        const pingInterval = setInterval(() => {
          res.write(`: ping\n\n`);
        }, 30000);

        // Cleanup on disconnect
        req.on('close', () => {
          clearInterval(pingInterval);
          unsubscribe();
          logger.info(
            { gameId, viewerId: claims.viewerId },
            'Chat SSE connection closed'
          );
        });
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createPublicGameChatRouter(): Router {
  return router;
}

// For testing
export function setChatService(service: ChatService): void {
  chatServiceInstance = service;
}

