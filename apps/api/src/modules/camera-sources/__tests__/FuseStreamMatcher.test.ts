/**
 * FuseStreamMatcher tests (TDD — RED phase).
 * Fuzzy matching of live stream titles to DirectStreamEvent titles.
 */

import { describe, it, expect } from 'vitest';
import { FuseStreamMatcher } from '../matching/FuseStreamMatcher';
import type { LiveStream, MatchCandidate } from '../interfaces';

describe('FuseStreamMatcher', () => {
  const defaultOptions = { minConfidence: 0.5 };

  it('should return empty array when no candidates', async () => {
    const matcher = new FuseStreamMatcher(defaultOptions);
    const rows: LiveStream[] = [
      {
        provider: 'veo',
        title: 'Timber Creek vs Byron Nelson',
        streamUrl: 'https://stream.mux.com/x',
      },
    ];
    const result = await matcher.match(rows, []);
    expect(result).toEqual([]);
  });

  it('should return empty array when no rows', async () => {
    const matcher = new FuseStreamMatcher(defaultOptions);
    const candidates: MatchCandidate[] = [
      {
        eventId: 'ev-1',
        eventSlug: 'soccer-varsity',
        title: 'Timber Creek vs Byron Nelson Varsity',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
    ];
    const result = await matcher.match([], candidates);
    expect(result).toEqual([]);
  });

  it('should match exact title with high confidence', async () => {
    const matcher = new FuseStreamMatcher(defaultOptions);
    const rows: LiveStream[] = [
      {
        provider: 'veo',
        title: 'Timber Creek vs Byron Nelson Varsity',
        streamUrl: 'https://stream.mux.com/abc',
      },
    ];
    const candidates: MatchCandidate[] = [
      {
        eventId: 'ev-1',
        eventSlug: 'soccer-varsity',
        title: 'Timber Creek vs Byron Nelson Varsity',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
    ];
    const result = await matcher.match(rows, candidates);
    expect(result).toHaveLength(1);
    expect(result[0].event.eventSlug).toBe('soccer-varsity');
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.9);
    expect(result[0].stream.streamUrl).toBe('https://stream.mux.com/abc');
  });

  it('should skip streams with an empty streamUrl', async () => {
    const matcher = new FuseStreamMatcher(defaultOptions);
    const rows: LiveStream[] = [
      {
        provider: 'veo',
        title: 'Some Match',
        streamUrl: '',
      },
    ];
    const candidates: MatchCandidate[] = [
      {
        eventId: 'ev-1',
        eventSlug: 'ev',
        title: 'Some Match',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
    ];
    const result = await matcher.match(rows, candidates);
    expect(result).toHaveLength(0);
  });

  it('should pick best match when multiple candidates are close', async () => {
    const matcher = new FuseStreamMatcher(defaultOptions);
    const rows: LiveStream[] = [
      {
        provider: 'veo',
        title: 'Timber Creek High School vs Byron Nelson Varsity',
        streamUrl: 'https://stream.mux.com/xyz',
      },
    ];
    const candidates: MatchCandidate[] = [
      {
        eventId: 'ev-1',
        eventSlug: 'other',
        title: 'Random Other Game',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
      {
        eventId: 'ev-2',
        eventSlug: 'varsity',
        title: 'Timber Creek High School vs Byron Nelson Varsity',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
    ];
    const result = await matcher.match(rows, candidates);
    expect(result).toHaveLength(1);
    expect(result[0].event.eventSlug).toBe('varsity');
  });

  it('should not return match when best score is below minConfidence', async () => {
    const matcher = new FuseStreamMatcher({ minConfidence: 0.95 });
    const rows: LiveStream[] = [
      {
        provider: 'veo',
        title: 'Completely Different Name XYZ',
        streamUrl: 'https://stream.mux.com/a',
      },
    ];
    const candidates: MatchCandidate[] = [
      {
        eventId: 'ev-1',
        eventSlug: 'ev',
        title: 'Some Other Event Title',
        directStreamSlug: 'tchs',
        currentStreamUrl: null,
      },
    ];
    const result = await matcher.match(rows, candidates);
    expect(result).toHaveLength(0);
  });
});
