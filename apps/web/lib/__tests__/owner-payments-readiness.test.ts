import { describe, it, expect } from 'vitest';

import type { OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isPaymentsReady,
  isStepComplete,
  visibleSteps,
} from '@/lib/owner-payments-readiness';

function status(over: Partial<OwnerPaymentsStatus> = {}): OwnerPaymentsStatus {
  return {
    recipientKey: 'owner-1',
    merchantId: null,
    agreementAccepted: false,
    agreementVersion: null,
    connected: false,
    connectedAt: null,
    locationId: null,
    ...over,
  };
}

describe('owner-payments-readiness', () => {
  it('returns connect_stripe when agreement is accepted but not connected', () => {
    expect(getPaymentsReadinessPhase(status({ agreementAccepted: true }))).toBe('connect_stripe');
    expect(getPaymentsBadgeLabel('connect_stripe')).toBe('Connect Stripe');
  });

  it('returns ready for relay stripe without location when requiresLocationId is false', () => {
    const ready = status({
      agreementAccepted: true,
      connected: true,
      requiresLocationId: false,
      locationId: null,
    });
    expect(getPaymentsReadinessPhase(ready)).toBe('ready');
    expect(isPaymentsReady(ready)).toBe(true);
    expect(visibleSteps(ready)).toEqual([1, 2]);
  });

  it('returns add_location when legacy flow requires location', () => {
    expect(
      getPaymentsReadinessPhase(status({ agreementAccepted: true, connected: true, requiresLocationId: true })),
    ).toBe('add_location');
  });

  it('derives the active step from readiness phase', () => {
    expect(getActiveStep(status())).toBe(1);
    expect(getActiveStep(status({ agreementAccepted: true }))).toBe(2);
    expect(getActiveStep(status({ agreementAccepted: true, connected: true, requiresLocationId: true }))).toBe(3);
  });

  it('marks steps complete based on onboarding progress', () => {
    const connected = status({ agreementAccepted: true, connected: true, requiresLocationId: true });
    expect(isStepComplete(1, connected)).toBe(true);
    expect(isStepComplete(2, connected)).toBe(true);
    expect(isStepComplete(3, connected)).toBe(false);
    expect(isStepComplete(3, { ...connected, locationId: 'LOC1' })).toBe(true);
  });
});
