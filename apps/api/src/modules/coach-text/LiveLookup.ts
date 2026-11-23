/**
 * Coach text commands: what is live on an account's cameras.
 *
 * A cold Veo lookup is several calls in a row and can outlast the reply window.
 * The coach is then told to text again, so this keeps one lookup in flight per
 * account and reuses a finished one for 15 seconds: the second text gets the
 * answer at once. In process only; with several API instances a second text may
 * start a new lookup, which still works, only slower.
 */

import type { ILiveStreamFinder, OwnerLiveStreams } from '../camera-sources/interfaces';

import { LOOKUP_REUSE_MS } from './config';
import type { ILiveLookup } from './interfaces';

export interface LiveLookupDeps {
  finder: ILiveStreamFinder;
  reuseMs?: number;
  nowMs?: () => number;
}

export class LiveLookup implements ILiveLookup {
  private readonly finder: ILiveStreamFinder;
  private readonly reuseMs: number;
  private readonly nowMs: () => number;
  private readonly inFlight = new Map<string, Promise<OwnerLiveStreams>>();
  private readonly finished = new Map<string, { atMs: number; result: OwnerLiveStreams }>();

  constructor(deps: LiveLookupDeps) {
    this.finder = deps.finder;
    this.reuseMs = deps.reuseMs ?? LOOKUP_REUSE_MS;
    this.nowMs = deps.nowMs ?? ((): number => Date.now());
  }

  find(ownerAccountId: string): Promise<OwnerLiveStreams> {
    const kept = this.finished.get(ownerAccountId);
    if (kept && this.nowMs() - kept.atMs < this.reuseMs) {
      return Promise.resolve(kept.result);
    }
    const running = this.inFlight.get(ownerAccountId);
    if (running) {
      return running;
    }

    const lookup = this.finder.findForOwner(ownerAccountId).then(
      (result) => {
        this.finished.set(ownerAccountId, { atMs: this.nowMs(), result });
        this.inFlight.delete(ownerAccountId);
        return result;
      },
      (error: unknown) => {
        this.inFlight.delete(ownerAccountId);
        throw error;
      }
    );
    this.inFlight.set(ownerAccountId, lookup);
    return lookup;
  }
}
