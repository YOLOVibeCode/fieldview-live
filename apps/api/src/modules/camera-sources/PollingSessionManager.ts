/**
 * In-memory tracker of active live-stream polling sessions per owner (ownerAccountId).
 * One poller per owner; prevents duplicate pollers; cleans up on stop via onStop callback.
 */

import type { ILiveStreamPoller, PollingConfig } from './interfaces';

export class PollingSessionManager {
  private sessions = new Map<string, ILiveStreamPoller>();

  isPolling(ownerAccountId: string): boolean {
    return this.sessions.has(ownerAccountId);
  }

  async startPolling(
    ownerAccountId: string,
    poller: ILiveStreamPoller,
    config: PollingConfig
  ): Promise<void> {
    if (this.sessions.has(ownerAccountId)) return;

    const wrappedConfig: PollingConfig = {
      ...config,
      onStop: () => {
        this.sessions.delete(ownerAccountId);
      },
    };
    await poller.start(wrappedConfig);
    this.sessions.set(ownerAccountId, poller);
  }

  async stopPolling(ownerAccountId: string): Promise<void> {
    const poller = this.sessions.get(ownerAccountId);
    if (poller) {
      await poller.stop();
      this.sessions.delete(ownerAccountId);
    }
  }

  getActiveCount(): number {
    return this.sessions.size;
  }
}
