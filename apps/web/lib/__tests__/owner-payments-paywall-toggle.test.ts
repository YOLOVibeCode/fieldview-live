import { describe, expect, it } from 'vitest';

import { isPaywallToggleDisabled } from '../owner-payments-readiness';

describe('isPaywallToggleDisabled', () => {
  it('lets a ready coach turn the paywall on or off', () => {
    expect(isPaywallToggleDisabled(true, false)).toBe(false);
    expect(isPaywallToggleDisabled(true, true)).toBe(false);
  });

  it('lets a disconnected coach turn an active paywall off', () => {
    expect(isPaywallToggleDisabled(false, true)).toBe(false);
  });

  it('stops a disconnected coach from turning the paywall on', () => {
    expect(isPaywallToggleDisabled(false, false)).toBe(true);
  });
});
