/**
 * Fuzzy match live stream titles to DirectStreamEvent candidates using Fuse.js.
 */

import Fuse from 'fuse.js';

import type { IStreamMatcher, LiveStream, MatchCandidate, StreamMatch } from '../interfaces';

export interface FuseStreamMatcherOptions {
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.5;

export class FuseStreamMatcher implements IStreamMatcher {
  private minConfidence: number;

  constructor(options: FuseStreamMatcherOptions = {}) {
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  }

  async match(streams: LiveStream[], candidates: MatchCandidate[]): Promise<StreamMatch[]> {
    if (candidates.length === 0 || streams.length === 0) {
      return [];
    }

    const fuse = new Fuse(candidates, {
      keys: ['title'],
      includeScore: true,
      threshold: 1 - this.minConfidence,
    });

    const results: StreamMatch[] = [];

    for (const stream of streams) {
      if (!stream.streamUrl) {
        continue;
      }
      const searchResult = fuse.search(stream.title)[0];
      if (!searchResult || searchResult.score == null) {
        continue;
      }
      const confidence = 1 - searchResult.score;
      if (confidence < this.minConfidence) {
        continue;
      }
      results.push({
        stream,
        event: searchResult.item,
        confidence,
      });
    }

    return results;
  }
}
