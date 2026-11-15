import { describe, it, expect, vi } from 'vitest';

import type { LiveStream, MatchCandidate, StreamMatch, UpdateResult } from '../interfaces';
import { LiveStreamSyncer } from '../LiveStreamSyncer';

const OWNER = 'owner-1';
const stream: LiveStream = { provider: 'veo', title: 'Diablos vs Storm', streamUrl: 'https://stream.mux.com/L.m3u8' };
const candidate: MatchCandidate = {
  eventId: 'ev-1',
  eventSlug: 'diablos-storm',
  title: 'Diablos vs Storm',
  directStreamSlug: 'diablos',
  currentStreamUrl: null,
};

function setup(opts: { streams?: LiveStream[]; matches?: StreamMatch[]; update?: UpdateResult } = {}) {
  const findForOwner = vi.fn(async () => ({ streams: opts.streams ?? [stream], sources: [] }));
  const getCandidates = vi.fn(async () => [candidate]);
  const match = vi.fn(async () => opts.matches ?? []);
  const updateStreamUrls = vi.fn(
    async (matches: StreamMatch[]): Promise<UpdateResult> =>
      opts.update ?? { updated: matches.length, skipped: 0, details: [] }
  );
  const syncer = new LiveStreamSyncer({
    finder: { findForOwner },
    candidateReader: { getCandidates },
    matcher: { match },
    updater: { updateStreamUrls },
  });
  return { syncer, findForOwner, getCandidates, match, updateStreamUrls };
}

describe('LiveStreamSyncer', () => {
  it('finds live streams, matches them to the owner’s games and saves the links', async () => {
    const good: StreamMatch = { stream, event: candidate, confidence: 0.9 };
    const { syncer, findForOwner, getCandidates, match, updateStreamUrls } = setup({ matches: [good] });

    const result = await syncer.syncOwner(OWNER);

    expect(findForOwner).toHaveBeenCalledWith(OWNER);
    expect(getCandidates).toHaveBeenCalledWith(OWNER);
    expect(match).toHaveBeenCalledWith([stream], [candidate]);
    expect(updateStreamUrls).toHaveBeenCalledWith([good]);
    expect(result).toEqual({ found: 1, matched: 1, updated: 1, skipped: 0, details: [] });
  });

  it('only saves matches at or above the default 0.7 confidence', async () => {
    const weak: StreamMatch = { stream, event: candidate, confidence: 0.69 };
    const strong: StreamMatch = { stream, event: candidate, confidence: 0.7 };
    const { syncer, updateStreamUrls } = setup({ matches: [weak, strong] });

    const result = await syncer.syncOwner(OWNER);

    expect(updateStreamUrls).toHaveBeenCalledWith([strong]);
    expect(result.matched).toBe(1);
  });

  it('honours a caller-supplied minimum confidence', async () => {
    const weak: StreamMatch = { stream, event: candidate, confidence: 0.55 };
    const { syncer, updateStreamUrls } = setup({ matches: [weak] });

    await syncer.syncOwner(OWNER, { minConfidence: 0.5 });

    expect(updateStreamUrls).toHaveBeenCalledWith([weak]);
  });

  it('does no database work when nothing is live', async () => {
    const { syncer, getCandidates, match, updateStreamUrls } = setup({ streams: [] });

    const result = await syncer.syncOwner(OWNER);

    expect(getCandidates).not.toHaveBeenCalled();
    expect(match).not.toHaveBeenCalled();
    expect(updateStreamUrls).not.toHaveBeenCalled();
    expect(result).toEqual({ found: 0, matched: 0, updated: 0, skipped: 0, details: [] });
  });
});
