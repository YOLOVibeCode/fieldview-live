/**
 * Scoreboard PubSub Abstraction
 *
 * In-memory POC (works for single instance).
 * Production: swap with Redis-backed implementation for multi-replica.
 */

import { logger } from './logger';

export interface ScoreboardEvent {
  homeTeamName: string;
  awayTeamName: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  homeScore: number;
  awayScore: number;
  clockMode: string;
  clockSeconds: number;
  clockStartedAt: string | null;
  isVisible: boolean;
  position: string;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

export interface IScoreboardPubSub {
  publish(slug: string, data: ScoreboardEvent): void;
  subscribe(slug: string, handler: (data: ScoreboardEvent) => void): () => void;
}

export class InMemoryScoreboardPubSub implements IScoreboardPubSub {
  private handlers = new Map<string, Set<(data: ScoreboardEvent) => void>>();

  publish(slug: string, data: ScoreboardEvent): void {
    const handlers = this.handlers.get(slug);
    if (!handlers || handlers.size === 0) {
      logger.debug({ slug }, 'No subscribers for scoreboard');
      return;
    }

    logger.debug({ slug, subscribers: handlers.size }, 'Broadcasting scoreboard update');

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error({ error, slug }, 'Error in scoreboard subscriber handler');
      }
    });
  }

  subscribe(slug: string, handler: (data: ScoreboardEvent) => void): () => void {
    if (!this.handlers.has(slug)) {
      this.handlers.set(slug, new Set());
    }

    const handlers = this.handlers.get(slug)!;
    handlers.add(handler);

    logger.debug({ slug, totalSubscribers: handlers.size }, 'New scoreboard subscriber');

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(slug);
      }
      logger.debug({ slug, totalSubscribers: handlers.size }, 'Scoreboard subscriber removed');
    };
  }
}

// Singleton instance
let instance: IScoreboardPubSub | null = null;

export function getScoreboardPubSub(): IScoreboardPubSub {
  if (!instance) {
    instance = new InMemoryScoreboardPubSub();
    logger.info('Initialized in-memory scoreboard pubsub');
  }
  return instance;
}

export function setScoreboardPubSub(pubsub: IScoreboardPubSub): void {
  instance = pubsub;
}
