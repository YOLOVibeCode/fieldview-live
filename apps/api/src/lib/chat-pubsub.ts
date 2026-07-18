/**
 * Chat PubSub Abstraction
 * 
 * In-memory POC (works for single instance).
 * Production: swap with RedisChatPubSub for multi-replica.
 */

import type { GameChatMessage } from '@prisma/client';
import { logger } from './logger';

export interface AdminBroadcastPayload {
  message: string;
}

export interface IChatPubSub {
  publish(gameId: string, message: GameChatMessage): Promise<void>;
  subscribe(gameId: string, handler: (msg: GameChatMessage) => void): () => void;
  publishBroadcast(gameId: string, payload: AdminBroadcastPayload): Promise<void>;
  subscribeBroadcast(gameId: string, handler: (payload: AdminBroadcastPayload) => void): () => void;
  getSubscriberCount(gameId: string): number;
}

/**
 * In-memory PubSub (POC, single-instance only)
 */
export class InMemoryChatPubSub implements IChatPubSub {
  private handlers = new Map<string, Set<(msg: GameChatMessage) => void>>();
  private broadcastHandlers = new Map<string, Set<(payload: AdminBroadcastPayload) => void>>();

  async publish(gameId: string, message: GameChatMessage): Promise<void> {
    const handlers = this.handlers.get(gameId);
    if (!handlers || handlers.size === 0) {
      logger.debug({ gameId, messageId: message.id }, 'No subscribers for game chat');
      return;
    }

    logger.debug({ gameId, messageId: message.id, subscribers: handlers.size }, 'Broadcasting chat message');
    
    handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        logger.error({ error, gameId, messageId: message.id }, 'Error in chat subscriber handler');
      }
    });
  }

  subscribe(gameId: string, handler: (msg: GameChatMessage) => void): () => void {
    if (!this.handlers.has(gameId)) {
      this.handlers.set(gameId, new Set());
    }

    const handlers = this.handlers.get(gameId)!;
    handlers.add(handler);

    logger.debug({ gameId, totalSubscribers: handlers.size }, 'New chat subscriber');

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(gameId);
      }
      logger.debug({ gameId, totalSubscribers: handlers.size }, 'Chat subscriber removed');
    };
  }

  getSubscriberCount(gameId: string): number {
    return this.handlers.get(gameId)?.size ?? 0;
  }

  async publishBroadcast(gameId: string, payload: AdminBroadcastPayload): Promise<void> {
    const handlers = this.broadcastHandlers.get(gameId);
    if (!handlers || handlers.size === 0) {
      logger.debug({ gameId }, 'No subscribers for admin broadcast');
      return;
    }
    logger.debug({ gameId, subscribers: handlers.size }, 'Broadcasting admin broadcast');
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error({ error, gameId }, 'Error in broadcast subscriber handler');
      }
    });
  }

  subscribeBroadcast(gameId: string, handler: (payload: AdminBroadcastPayload) => void): () => void {
    if (!this.broadcastHandlers.has(gameId)) {
      this.broadcastHandlers.set(gameId, new Set());
    }
    const handlers = this.broadcastHandlers.get(gameId)!;
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.broadcastHandlers.delete(gameId);
      }
    };
  }
}

// Singleton instance for the application
let pubsubInstance: IChatPubSub | null = null;

export function getChatPubSub(): IChatPubSub {
  if (!pubsubInstance) {
    pubsubInstance = new InMemoryChatPubSub();
    logger.info('Initialized in-memory chat pubsub');
  }
  return pubsubInstance;
}

// For testing: allow injection
export function setChatPubSub(pubsub: IChatPubSub): void {
  pubsubInstance = pubsub;
}

