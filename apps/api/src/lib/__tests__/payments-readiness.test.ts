import { describe, expect, it, vi } from 'vitest';

import {
  assertPaymentsReadyForPaywallChange,
  getOwnerPaymentsReadiness,
  wouldChargeViewers,
} from '../payments-readiness';

describe('wouldChargeViewers', () => {
  it('does not charge for sub-dollar paid prices', () => {
    expect(wouldChargeViewers(true, 99)).toBe(false);
    expect(wouldChargeViewers(true, 50)).toBe(false);
  });

  it('charges when paywall is on and price meets minimum', () => {
    expect(wouldChargeViewers(true, 100)).toBe(true);
    expect(wouldChargeViewers(true, 500)).toBe(true);
  });

  it('does not charge when paywall is off', () => {
    expect(wouldChargeViewers(false, 500)).toBe(false);
  });
});

describe('getOwnerPaymentsReadiness', () => {
  it('returns store ready when seller onboarded', () => {
    expect(
      getOwnerPaymentsReadiness({
        marketplaceSellerKey: 'owner-1',
        paymentsConnectedAt: new Date(),
      }),
    ).toEqual({ ready: true, provider: 'store' });
  });

  it('returns not ready without paymentsConnectedAt', () => {
    expect(
      getOwnerPaymentsReadiness({
        marketplaceSellerKey: 'owner-1',
        paymentsConnectedAt: null,
      }).ready,
    ).toBe(false);
  });
});

describe('assertPaymentsReadyForPaywallChange', () => {
  const unready = { marketplaceSellerKey: 'owner-1', paymentsConnectedAt: null };
  const paywalled = { paywallEnabled: true, priceInCents: 500 };

  it('lets a disconnected coach save settings that do not touch the paywall', () => {
    expect(() => assertPaymentsReadyForPaywallChange(unready, {}, paywalled)).not.toThrow();
  });

  it('treats re-sending the same paywall and price as no change', () => {
    expect(() =>
      assertPaymentsReadyForPaywallChange(unready, { paywallEnabled: true, priceInCents: 500 }, paywalled),
    ).not.toThrow();
  });

  it('lets a disconnected coach turn the paywall off', () => {
    expect(() => assertPaymentsReadyForPaywallChange(unready, { paywallEnabled: false }, paywalled)).not.toThrow();
  });

  it('blocks a disconnected coach from changing the price of a paywalled stream', () => {
    expect(() => assertPaymentsReadyForPaywallChange(unready, { priceInCents: 700 }, paywalled)).toThrow(
      /Connect payments/,
    );
  });

  it('blocks a disconnected coach from turning the paywall on', () => {
    expect(() =>
      assertPaymentsReadyForPaywallChange(unready, { paywallEnabled: true }, { paywallEnabled: false, priceInCents: 500 }),
    ).toThrow(/Connect payments/);
  });
});
