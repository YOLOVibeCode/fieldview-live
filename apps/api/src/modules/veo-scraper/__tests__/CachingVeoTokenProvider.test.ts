import { describe, it, expect, vi } from 'vitest';

import { CachingVeoTokenProvider } from '../implementations/CachingVeoTokenProvider';
import type { IVeoTokenMinter, MintedToken } from '../interfaces';

function minterReturning(...tokens: MintedToken[]): { minter: IVeoTokenMinter; mint: any } {
  let i = 0;
  const mint = vi.fn(async () => tokens[Math.min(i++, tokens.length - 1)]);
  return { minter: { mint }, mint };
}

const COOKIE = '_session=abc';

describe('CachingVeoTokenProvider', () => {
  it('mints once, then serves the cached token within its lifetime', async () => {
    const { minter, mint } = minterReturning({ accessToken: 'AT1', expiresInSec: 3600 });
    let t = 1000;
    const p = new CachingVeoTokenProvider({ minter, sessionCookie: COOKIE, now: () => t });

    expect(await p.getAccessToken()).toBe('AT1');
    t += 60_000; // +1 min, well within the hour
    expect(await p.getAccessToken()).toBe('AT1');
    expect(mint).toHaveBeenCalledTimes(1);
    expect(mint).toHaveBeenCalledWith(COOKIE);
  });

  it('re-mints once the token is within the safety margin of expiry', async () => {
    const { minter, mint } = minterReturning(
      { accessToken: 'AT1', expiresInSec: 3600 },
      { accessToken: 'AT2', expiresInSec: 3600 }
    );
    let t = 0;
    const p = new CachingVeoTokenProvider({ minter, sessionCookie: COOKIE, now: () => t, safetyMarginSec: 60 });

    expect(await p.getAccessToken()).toBe('AT1');
    t += (3600 - 30) * 1000; // inside the 60s safety margin
    expect(await p.getAccessToken()).toBe('AT2');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces a re-mint on the next call (e.g. after a 401)', async () => {
    const { minter, mint } = minterReturning(
      { accessToken: 'AT1', expiresInSec: 3600 },
      { accessToken: 'AT2', expiresInSec: 3600 }
    );
    let t = 0;
    const p = new CachingVeoTokenProvider({ minter, sessionCookie: COOKIE, now: () => t });

    expect(await p.getAccessToken()).toBe('AT1');
    p.invalidate();
    expect(await p.getAccessToken()).toBe('AT2');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed mint (retries next call)', async () => {
    const mint = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ accessToken: 'AT-ok', expiresInSec: 3600 });
    const p = new CachingVeoTokenProvider({ minter: { mint }, sessionCookie: COOKIE, now: () => 0 });

    await expect(p.getAccessToken()).rejects.toThrow('boom');
    expect(await p.getAccessToken()).toBe('AT-ok');
    expect(mint).toHaveBeenCalledTimes(2);
  });
});
