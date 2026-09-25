import { describe, expect, it, vi } from 'vitest';

import { getOwnerPaymentsReadiness } from '../payments-readiness';

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
