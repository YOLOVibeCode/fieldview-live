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
  squareAccessTokenEncrypted: null,
  squareTokenExpiresAt: null,
};

const legacyReadyOwner: OwnerPaymentsReadinessInput = {
  relayRecipientKey: null,
  agreementAcceptedVersion: null,
  squareLocationId: 'LOC1',
  squareAccessTokenEncrypted: 'enc:token',
  squareTokenExpiresAt: new Date(Date.now() + 60_000),
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getOwnerPaymentsReadiness', () => {
  it('returns relay provider when PAYMENTS_VIA_RELAY and all relay fields are set', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    expect(getOwnerPaymentsReadiness(relayReadyOwner)).toEqual({
      ready: true,
      provider: 'relay',
    });
  });

  it('returns not ready when relay flag on but recipient key missing', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      relayRecipientKey: null,
    });
    expect(result.ready).toBe(false);
    expect(result.provider).toBeNull();
    expect(result.reason).toContain('not connected');
  });

  it('returns not ready when relay flag on but agreement missing', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      agreementAcceptedVersion: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('agreement');
  });

  it('returns not ready when relay flag on but location missing', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    const result = getOwnerPaymentsReadiness({
      ...relayReadyOwner,
      squareLocationId: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('location');
  });

  it('returns legacy provider when relay flag off and legacy token valid', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'false');
    expect(getOwnerPaymentsReadiness(legacyReadyOwner)).toEqual({
      ready: true,
      provider: 'legacy',
    });
  });

  it('returns not ready when legacy token expired', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'false');
    const result = getOwnerPaymentsReadiness({
      ...legacyReadyOwner,
      squareTokenExpiresAt: new Date(Date.now() - 60_000),
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('returns not ready when legacy token missing', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'false');
    const result = getOwnerPaymentsReadiness({
      ...legacyReadyOwner,
      squareAccessTokenEncrypted: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain('not connected');
  });

  it('falls back to legacy when relay flag on but relay incomplete and legacy valid', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    expect(getOwnerPaymentsReadiness(legacyReadyOwner)).toEqual({
      ready: true,
      provider: 'legacy',
    });
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
    expect(() =>
      assertPaymentsReadyForPaywall(
        { ...relayReadyOwner, relayRecipientKey: null },
        false,
        0,
      ),
    ).not.toThrow();
  });

  it('does nothing when owner is ready', () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    expect(() => assertPaymentsReadyForPaywall(relayReadyOwner, true, 500)).not.toThrow();
  });

  it('does nothing when bypass is true', () => {
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
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
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
