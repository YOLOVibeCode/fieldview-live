/**
 * Bookmark PubSub Abstraction
 *
 * In-memory POC (works for single instance).
 * Production: swap with Redis-backed implementation for multi-replica.
 */

import { logger } from './logger';

export interface BookmarkEvent {
  type: 'bookmark_created' | 'bookmark_deleted' | 'bookmark_updated' | 'stream_ended';
  bookmark?: {
    id: string;
    gameId?: string | null;
    directStreamId?: string | null;
    clipId?: string | null;
    viewerIdentityId?: string | null;
    timestampSeconds: number;
    label: string;
    notes?: string | null;
    isShared: boolean;
    bufferSeconds?: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

export interface IBookmarkPubSub {
  publish(slug: string, data: BookmarkEvent): void;
  subscribe(slug: string, handler: (data: BookmarkEvent) => void): () => void;
}

export class InMemoryBookmarkPubSub implements IBookmarkPubSub {
  private handlers = new Map<string, Set<(data: BookmarkEvent) => void>>();

  publish(slug: string, data: BookmarkEvent): void {
    const handlers = this.handlers.get(slug);
    if (!handlers || handlers.size === 0) {
      logger.debug({ slug, type: data.type }, 'No subscribers for bookmark event');
      return;
    }

    logger.debug({ slug, type: data.type, subscribers: handlers.size }, 'Broadcasting bookmark event');

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error({ error, slug }, 'Error in bookmark subscriber handler');
      }
    });
  }

  subscribe(slug: string, handler: (data: BookmarkEvent) => void): () => void {
    if (!this.handlers.has(slug)) {
      this.handlers.set(slug, new Set());
    }

    const handlers = this.handlers.get(slug)!;
    handlers.add(handler);

    logger.debug({ slug, totalSubscribers: handlers.size }, 'New bookmark subscriber');

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(slug);
      }
      logger.debug({ slug, totalSubscribers: handlers.size }, 'Bookmark subscriber removed');
    };
  }
}

// Singleton instance
let instance: IBookmarkPubSub | null = null;

export function getBookmarkPubSub(): IBookmarkPubSub {
  if (!instance) {
    instance = new InMemoryBookmarkPubSub();
    logger.info('Initialized in-memory bookmark pubsub');
  }
  return instance;
}

export function setBookmarkPubSub(pubsub: IBookmarkPubSub): void {
  instance = pubsub;
}
