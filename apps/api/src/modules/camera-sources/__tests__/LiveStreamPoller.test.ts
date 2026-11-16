/**
 * LiveStreamPoller tests.
 * Repeats the sync on an interval; stops on first match, on max duration, or on stop().
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

import type { ILiveStreamSyncer, PollingConfig, SyncResult } from '../interfaces';
import { LiveStreamPoller } from '../LiveStreamPoller';

const NOTHING: SyncResult = { found: 0, matched: 0, updated: 0, skipped: 0, details: [] };
const UPDATED: SyncResult = { ...NOTHING, found: 1, matched: 1, updated: 1 };

const config: PollingConfig = {
  ownerAccountId: 'owner-1',
  minConfidence: 0.7,
  intervalMs: 60_000,
  maxDurationMs: 600_000,
  stopOnFirstMatch: true,
};

describe('LiveStreamPoller', () => {
  let syncOwner: Mock<Parameters<ILiveStreamSyncer['syncOwner']>, ReturnType<ILiveStreamSyncer['syncOwner']>>;
  let syncer: ILiveStreamSyncer;

  beforeEach(() => {
    vi.useFakeTimers();
    syncOwner = vi.fn<Parameters<ILiveStreamSyncer['syncOwner']>, ReturnType<ILiveStreamSyncer['syncOwner']>>().mockResolvedValue(NOTHING);
    syncer = { syncOwner };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs the owner once per interval after start', async () => {
    const poller = new LiveStreamPoller(syncer);
    await poller.start(config);
    expect(syncOwner).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(syncOwner).toHaveBeenCalledTimes(1);
    expect(syncOwner).toHaveBeenCalledWith('owner-1', { minConfidence: 0.7 });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(syncOwner).toHaveBeenCalledTimes(2);
    await poller.stop();
  });

  it('pollOnce does nothing before start', async () => {
    const poller = new LiveStreamPoller(syncer);
    expect(await poller.pollOnce()).toEqual(NOTHING);
    expect(syncOwner).not.toHaveBeenCalled();
  });

  it('stops after the first saved link when stopOnFirstMatch is on', async () => {
    syncOwner.mockResolvedValue(UPDATED);
    const onStop = vi.fn();
    const poller = new LiveStreamPoller(syncer);
    await poller.start({ ...config, onStop });

    const result = await poller.pollOnce();

    expect(result.updated).toBe(1);
    expect(onStop).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(syncOwner).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after a saved link when stopOnFirstMatch is off', async () => {
    syncOwner.mockResolvedValue(UPDATED);
    const onStop = vi.fn();
    const poller = new LiveStreamPoller(syncer);
    await poller.start({ ...config, stopOnFirstMatch: false, onStop });

    await poller.pollOnce();

    expect(onStop).not.toHaveBeenCalled();
    await poller.stop();
  });

  it('keeps polling while nothing has been saved', async () => {
    const onStop = vi.fn();
    const poller = new LiveStreamPoller(syncer);
    await poller.start({ ...config, onStop });

    await poller.pollOnce();

    expect(onStop).not.toHaveBeenCalled();
    await poller.stop();
  });

  it('stops by itself once maxDurationMs has elapsed', async () => {
    const onStop = vi.fn();
    const poller = new LiveStreamPoller(syncer);
    await poller.start({ ...config, intervalMs: 50, maxDurationMs: 100, onStop });

    await vi.advanceTimersByTimeAsync(50);
    expect(syncOwner).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);

    expect(onStop).toHaveBeenCalledTimes(1);
    const callsAtStop = syncOwner.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);
    expect(syncOwner).toHaveBeenCalledTimes(callsAtStop);
  });

  it('survives a failing sync and tries again on the next interval', async () => {
    syncOwner.mockRejectedValueOnce(new Error('database down')).mockResolvedValue(NOTHING);
    const poller = new LiveStreamPoller(syncer);
    await poller.start(config);

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(syncOwner).toHaveBeenCalledTimes(2);
    await poller.stop();
  });

  it('stop() ends polling and reports it through onStop', async () => {
    const onStop = vi.fn();
    const poller = new LiveStreamPoller(syncer);
    await poller.start({ ...config, onStop });

    await poller.stop();
    await vi.advanceTimersByTimeAsync(180_000);

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(syncOwner).not.toHaveBeenCalled();
  });
});
