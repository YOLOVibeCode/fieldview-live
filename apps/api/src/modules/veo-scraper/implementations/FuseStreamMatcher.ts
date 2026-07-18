/**
 * Fuzzy match Veo diagnostics rows to DirectStreamEvent candidates using Fuse.js.
 */

import Fuse from 'fuse.js';
import type {
  IVeoStreamMatcher,
  VeoMatchRow,
  MatchCandidate,
  StreamMatch,
} from '../interfaces';

export interface FuseStreamMatcherOptions {
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.5;

export class FuseStreamMatcher implements IVeoStreamMatcher {
  private minConfidence: number;

  constructor(options: FuseStreamMatcherOptions = {}) {
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  }

  async match(
    scrapedRows: VeoMatchRow[],
    candidates: MatchCandidate[]
  ): Promise<StreamMatch[]> {
    if (candidates.length === 0 || scrapedRows.length === 0) {
      return [];
    }

    const fuse = new Fuse(candidates, {
      keys: ['title'],
      includeScore: true,
      threshold: 1 - this.minConfidence,
    });

    const results: StreamMatch[] = [];

    for (const row of scrapedRows) {
      if (row.streamUrl == null || row.streamUrl === '') {
        continue;
      }
      const searchResult = fuse.search(row.matchName)[0];
      if (!searchResult || searchResult.score == null) {
        continue;
      }
      const confidence = 1 - searchResult.score;
      if (confidence < this.minConfidence) {
        continue;
      }
      results.push({
        veoRow: row,
        event: searchResult.item,
        confidence,
      });
    }

    return results;
  }
}
