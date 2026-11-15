/**
 * LiveStreamSyncer — one pass of: find the owner's live streams → fuzzy-match them
 * to their scheduled games → save the links on confident matches.
 */

import {
  DEFAULT_MIN_CONFIDENCE,
  type ICandidateReader,
  type ILiveStreamFinder,
  type ILiveStreamSyncer,
  type IStreamMatcher,
  type IStreamUrlUpdater,
  type SyncResult,
} from './interfaces';

export interface LiveStreamSyncerDeps {
  finder: ILiveStreamFinder;
  candidateReader: ICandidateReader;
  matcher: IStreamMatcher;
  updater: IStreamUrlUpdater;
}

export class LiveStreamSyncer implements ILiveStreamSyncer {
  constructor(private readonly deps: LiveStreamSyncerDeps) {}

  async syncOwner(ownerAccountId: string, opts: { minConfidence?: number } = {}): Promise<SyncResult> {
    const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

    const { streams } = await this.deps.finder.findForOwner(ownerAccountId);
    if (streams.length === 0) {
      return { found: 0, matched: 0, updated: 0, skipped: 0, details: [] };
    }

    const candidates = await this.deps.candidateReader.getCandidates(ownerAccountId);
    const matches = await this.deps.matcher.match(streams, candidates);
    const confident = matches.filter((m) => m.confidence >= minConfidence);
    const update = await this.deps.updater.updateStreamUrls(confident);

    return {
      found: streams.length,
      matched: confident.length,
      updated: update.updated,
      skipped: update.skipped,
      details: update.details,
    };
  }
}
