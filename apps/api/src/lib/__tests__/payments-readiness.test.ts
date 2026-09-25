import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertPaymentsReadyForPaywall,
  getOwnerPaymentsReadiness,
  type OwnerPaymentsReadinessInput,
  wouldChargeViewers,
} from '../payments-readiness';

const relayReadyOwner: OwnerPaymentsReadinessInput = {
  relayRecipientKey: 'owner-1',
  agreementAcceptedVersion: 'v1',
  squareLocationId: 'LOC1',
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getOwnerPaymentsReadiness', () => {
  it('returns relay provider when relay configured and all fields set', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    expect(getOwnerPaymentsReadiness(relayReadyOwner)).toEqual({
      ready: true,
      provider: 'relay',
    });
  });

  it('returns not ready when relay API key missing', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', '');
    const result = getOwnerPaymentsReadiness(relayReadyOwner);
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('not configured');
  });

  it('returns not ready when recipient key missing', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      relayRecipientKey: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('not connected');
  });

  it('returns not ready when agreement missing', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      agreementAcceptedVersion: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('agreement');
  });

  it('returns not ready when location missing', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      squareLocationId: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('location');
  });
});

describe('wouldChargeViewers', () => {
  it('is false when paywall is off', () => {
    expect(wouldChargeViewers(false, 1000)).toBe(false);
  });

  it('is false when price is zero', () => {
    expect(wouldChargeViewers(true, 0)).toBe(false);
  });

  it('is true when paywall on and price positive', () => {
    expect(wouldChargeViewers(true, 499)).toBe(true);
  });
});

describe('assertPaymentsReadyForPaywall', () => {
  it('does nothing when paywall would not charge viewers', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    expect(() =>
      assertPaymentsReadyForPaywall(
        { ...relayReadyOwner, relayRecipientKey: null },
        false,
        0,
      ),
    ).not.toThrow();
  });

  it('does nothing when owner is ready', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    expect(() => assertPaymentsReadyForPaywall(relayReadyOwner, true, 500)).not.toThrow();
  });

  it('does nothing when bypass is true', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    expect(() =>
      assertPaymentsReadyForPaywall(
        { ...relayReadyOwner, relayRecipientKey: null },
        true,
        500,
        { bypass: true },
      ),
    ).not.toThrow();
  });

  it('throws PAYMENTS_NOT_CONNECTED when paid paywall and owner not ready', () => {
    vi.stubEnv('NOCTUSOFT_API_KEY', 'nsins_dk_test');
    try {
      assertPaymentsReadyForPaywall(
        { ...relayReadyOwner, relayRecipientKey: null },
        true,
        500,
      );
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'PAYMENTS_NOT_CONNECTED',
        statusCode: 400,
      });
      expect((error as Error).message).toContain('/owners/payments');
    }
  });
});
