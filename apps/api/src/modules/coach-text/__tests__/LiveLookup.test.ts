import { describe, expect, it, vi } from 'vitest';

import type { OwnerLiveStreams } from '../../camera-sources/interfaces';
import { LiveLookup } from '../LiveLookup';

const FOUND: OwnerLiveStreams = {
  streams: [{ provider: 'veo', title: 'A', streamUrl: 'https://stream.example.com/a.m3u8', startedAt: null }],
  sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }],
};

describe('LiveLookup', () => {
  it('keeps one lookup in flight per account', async () => {
    let release: (value: OwnerLiveStreams) => void = () => undefined;
    const findForOwner = vi.fn(() => new Promise<OwnerLiveStreams>((resolve) => (release = resolve)));
    const lookup = new LiveLookup({ finder: { findForOwner }, nowMs: () => 0 });

    const first = lookup.find('account-1');
    const second = lookup.find('account-1');
    release(FOUND);

    await expect(first).resolves.toBe(FOUND);
    await expect(second).resolves.toBe(FOUND);
    expect(findForOwner).toHaveBeenCalledTimes(1);
  });

  it('reuses a finished lookup for 15 seconds, then looks again', async () => {
    let now = 0;
    const findForOwner = vi.fn(() => Promise.resolve(FOUND));
    const lookup = new LiveLookup({ finder: { findForOwner }, nowMs: () => now });

    await lookup.find('account-1');
    now = 14_999;
    await lookup.find('account-1');
    expect(findForOwner).toHaveBeenCalledTimes(1);

    now = 15_000;
    await lookup.find('account-1');
    expect(findForOwner).toHaveBeenCalledTimes(2);
  });

  it('keeps accounts apart', async () => {
    const findForOwner = vi.fn(() => Promise.resolve(FOUND));
    const lookup = new LiveLookup({ finder: { findForOwner }, nowMs: () => 0 });

    await lookup.find('account-1');
    await lookup.find('account-2');

    expect(findForOwner).toHaveBeenCalledWith('account-1');
    expect(findForOwner).toHaveBeenCalledWith('account-2');
  });

  it('keeps no failed lookup', async () => {
    const findForOwner = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(FOUND);
    const lookup = new LiveLookup({ finder: { findForOwner }, nowMs: () => 0 });

    await expect(lookup.find('account-1')).rejects.toThrow('down');
    await expect(lookup.find('account-1')).resolves.toBe(FOUND);
  });

  it('lets a slow lookup finish for the next text after the first stopped waiting', async () => {
    let release: (value: OwnerLiveStreams) => void = () => undefined;
    const findForOwner = vi.fn(() => new Promise<OwnerLiveStreams>((resolve) => (release = resolve)));
    const lookup = new LiveLookup({ finder: { findForOwner }, nowMs: () => 0 });

    void lookup.find('account-1');
    release(FOUND);
    await Promise.resolve();
    await Promise.resolve();

    await expect(lookup.find('account-1')).resolves.toBe(FOUND);
    expect(findForOwner).toHaveBeenCalledTimes(1);
  });
});
