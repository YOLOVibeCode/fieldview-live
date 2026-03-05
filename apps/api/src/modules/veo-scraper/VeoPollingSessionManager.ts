/**
 * In-memory tracker of active Veo polling sessions per owner (ownerAccountId).
 * One poller per owner; prevents duplicate pollers; cleans up on stop via onStop callback.
 */

import type { IVeoPollingOrchestrator, PollingConfig } from './interfaces';

export class VeoPollingSessionManager {
  private sessions = new Map<string, IVeoPollingOrchestrator>();

  isPolling(ownerAccountId: string): boolean {
    return this.sessions.has(ownerAccountId);
  }

  async startPolling(
    ownerAccountId: string,
    poller: IVeoPollingOrchestrator,
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
