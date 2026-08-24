/**
 * Game Event PubSub
 *
 * In-memory POC (single instance). Mirrors chat-pubsub.
 */

import type { GameEventPayload } from '@fieldview/data-model';
import { logger } from './logger';

export interface IGameEventPubSub {
  publish(gameId: string, payload: GameEventPayload): Promise<void>;
  subscribe(gameId: string, handler: (payload: GameEventPayload) => void): () => void;
}

export class InMemoryGameEventPubSub implements IGameEventPubSub {
  private handlers = new Map<string, Set<(payload: GameEventPayload) => void>>();

  async publish(gameId: string, payload: GameEventPayload): Promise<void> {
    const handlers = this.handlers.get(gameId);
    if (!handlers || handlers.size === 0) return;
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error({ error, gameId, eventId: payload.id }, 'Error in game-event subscriber');
      }
    });
  }

  subscribe(gameId: string, handler: (payload: GameEventPayload) => void): () => void {
    if (!this.handlers.has(gameId)) {
      this.handlers.set(gameId, new Set());
    }
    const handlers = this.handlers.get(gameId)!;
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(gameId);
    };
  }
}

let instance: IGameEventPubSub | null = null;

export function getGameEventPubSub(): IGameEventPubSub {
  if (!instance) {
    instance = new InMemoryGameEventPubSub();
    logger.info('Initialized in-memory game-event pubsub');
  }
  return instance;
}

export function setGameEventPubSub(pubsub: IGameEventPubSub): void {
  instance = pubsub;
}
