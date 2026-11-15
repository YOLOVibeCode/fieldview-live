/**
 * LiveStreamPoller — repeat the sync every intervalMs until stopped, until a link
 * is saved (stopOnFirstMatch), or until maxDurationMs has passed.
 */

import { logger } from '../../lib/logger';

import type { ILiveStreamPoller, ILiveStreamSyncer, PollingConfig, SyncResult } from './interfaces';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_DURATION_MS = 7_200_000;
const DEFAULT_STOP_ON_FIRST_MATCH = true;

const NOTHING: SyncResult = { found: 0, matched: 0, updated: 0, skipped: 0, details: [] };

export class LiveStreamPoller implements ILiveStreamPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: PollingConfig | null = null;
  private startTime = 0;

  constructor(private readonly syncer: ILiveStreamSyncer) {}

  async start(config: PollingConfig): Promise<void> {
    if (this.config) {
      await this.stop();
    }
    const intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
    const maxDurationMs = config.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

    this.config = config;
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      if (Date.now() - this.startTime >= maxDurationMs) {
        void this.stop();
        return;
      }
      // A failed pass must not kill the poller (or the process): log and retry next tick.
      this.pollOnce().catch((err: unknown) => {
        logger.error({ err, ownerAccountId: config.ownerAccountId }, 'Live stream poll failed');
      });
    }, intervalMs);
  }

  stop(): Promise<void> {
    const config = this.config;
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config = null;
    config?.onStop?.();
    return Promise.resolve();
  }

  async pollOnce(): Promise<SyncResult> {
    const config = this.config;
    if (!config) return { ...NOTHING };

    const result = await this.syncer.syncOwner(config.ownerAccountId, { minConfidence: config.minConfidence });

    const stopOnFirstMatch = config.stopOnFirstMatch ?? DEFAULT_STOP_ON_FIRST_MATCH;
    if (stopOnFirstMatch && result.updated > 0) {
      await this.stop();
    }
    return result;
  }
}
