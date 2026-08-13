/**
 * CachingVeoTokenProvider — hands out a valid Veo access token, minting a new one
 * only when the cached token is missing or within `safetyMarginSec` of expiry.
 * Keeps the per-poll cost to a couple of HTTP calls at most once an hour.
 */

import type {
  IVeoAccessTokenProvider,
  IVeoTokenMinter,
} from '../interfaces';

export interface CachingVeoTokenProviderDeps {
  minter: IVeoTokenMinter;
  sessionCookie: string;
  /** Epoch millis clock (injectable for tests). Defaults to Date.now. */
  now?: () => number;
  /** Re-mint this many seconds before actual expiry. Default 60s. */
  safetyMarginSec?: number;
}

export class CachingVeoTokenProvider implements IVeoAccessTokenProvider {
  private readonly minter: IVeoTokenMinter;
  private readonly sessionCookie: string;
  private readonly now: () => number;
  private readonly marginMs: number;

  private cached: { token: string; expiresAtMs: number } | null = null;

  constructor(deps: CachingVeoTokenProviderDeps) {
    this.minter = deps.minter;
    this.sessionCookie = deps.sessionCookie;
    this.now = deps.now ?? Date.now;
    this.marginMs = (deps.safetyMarginSec ?? 60) * 1000;
  }

  /** Drop the cached token so the next call re-mints (e.g. after a 401). */
  invalidate(): void {
    this.cached = null;
  }

  async getAccessToken(): Promise<string> {
    if (this.cached && this.now() < this.cached.expiresAtMs - this.marginMs) {
      return this.cached.token;
    }
    const minted = await this.minter.mint(this.sessionCookie);
    this.cached = {
      token: minted.accessToken,
      expiresAtMs: this.now() + minted.expiresInSec * 1000,
    };
    return minted.accessToken;
  }
}
