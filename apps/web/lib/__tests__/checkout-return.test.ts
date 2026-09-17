import { describe, it, expect } from 'vitest';

import { extractDirectStreamSlug, parseDirectStreamReturnPath, watchPathFromPurchaseStatus } from '@/lib/checkout-return';

describe('checkout-return', () => {
  it('parses absolute direct stream return URLs', () => {
    expect(
      parseDirectStreamReturnPath('https://fieldview.live/direct/tchs?payment=success'),
    ).toBe('/direct/tchs?payment=success');
  });

  it('parses relative direct stream return paths', () => {
    expect(parseDirectStreamReturnPath('/direct/tchs/events/soccer?payment=success')).toBe(
      '/direct/tchs/events/soccer?payment=success',
    );
  });

  it('extracts slug from return URL', () => {
    expect(extractDirectStreamSlug('https://fieldview.live/direct/tchs?payment=success')).toBe('tchs');
  });

  it('returns null for invalid return URLs', () => {
    expect(parseDirectStreamReturnPath('/checkout/foo')).toBeNull();
    expect(extractDirectStreamSlug('')).toBeNull();
  });
});

describe('watchPathFromPurchaseStatus', () => {
  it('uses /direct/{slug} from an absolute watchUrl', () => {
    expect(
      watchPathFromPurchaseStatus({
        watchUrl: 'https://fieldview.live/direct/paid-stream',
        entitlementToken: 'tok',
      }),
    ).toBe('/direct/paid-stream');
  });

  it('falls back to /stream/{token} for game purchases', () => {
    expect(watchPathFromPurchaseStatus({ entitlementToken: 'tok' })).toBe('/stream/tok');
  });
});
