import { describe, expect, it } from 'vitest';

import type { OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isPaymentsReady,
  isStepComplete,
} from '@/lib/owner-payments-readiness';

const status = (over: Partial<OwnerPaymentsStatus> = {}): OwnerPaymentsStatus => ({
  sellerKey: null,
  merchantId: null,
  connected: false,
  connectedAt: null,
  ...over,
});

describe('owner payments readiness', () => {
  it('is not started before the agreement is accepted', () => {
    const s = status({ sellerKey: 'owner-1', agreementAccepted: false });
    expect(getPaymentsReadinessPhase(s)).toBe('not_started');
    expect(getActiveStep(s)).toBe(1);
    expect(isStepComplete(1, s)).toBe(false);
    expect(isStepComplete(2, s)).toBe(false);
    expect(getPaymentsBadgeLabel(getPaymentsReadinessPhase(s))).toBe('Not started');
  });

  it('moves to the connect step once the agreement is accepted', () => {
    const s = status({ sellerKey: 'owner-1', agreementAccepted: true });
    expect(getPaymentsReadinessPhase(s)).toBe('onboarding');
    expect(getActiveStep(s)).toBe(2);
    expect(isStepComplete(1, s)).toBe(true);
    expect(isPaymentsReady(s)).toBe(false);
  });

  it('is ready when the relay reports the seller connected', () => {
    const s = status({ sellerKey: 'owner-1', agreementAccepted: true, connected: true, connectedAt: '2026-11-07T00:00:00Z' });
    expect(getPaymentsReadinessPhase(s)).toBe('ready');
    expect(isPaymentsReady(s)).toBe(true);
    expect(isStepComplete(2, s)).toBe(true);
    expect(getPaymentsBadgeLabel('ready')).toBe('Ready');
  });

  it('treats an older status without agreement fields as accepted once a seller key exists', () => {
    const s = status({ sellerKey: 'owner-1' });
    expect(getActiveStep(s)).toBe(2);
    expect(getPaymentsReadinessPhase(s)).toBe('onboarding');
  });
});
