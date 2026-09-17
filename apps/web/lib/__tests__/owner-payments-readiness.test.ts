import { describe, it, expect } from 'vitest';

import type { OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isPaymentsReady,
  isStepComplete,
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
  it('returns not_started when agreement and connection are missing', () => {
    expect(getPaymentsReadinessPhase(status())).toBe('not_started');
    expect(getPaymentsBadgeLabel('not_started')).toBe('Not started');
  });

  it('returns agreement_needed when agreement is missing but connected', () => {
    expect(getPaymentsReadinessPhase(status({ connected: true }))).toBe('agreement_needed');
    expect(getPaymentsBadgeLabel('agreement_needed')).toBe('Agreement needed');
  });

  it('returns connect_square when agreement is accepted but not connected', () => {
    expect(getPaymentsReadinessPhase(status({ agreementAccepted: true }))).toBe('connect_square');
    expect(getPaymentsBadgeLabel('connect_square')).toBe('Connect Square');
  });

  it('returns add_location when connected but location is not saved', () => {
    expect(
      getPaymentsReadinessPhase(status({ agreementAccepted: true, connected: true })),
    ).toBe('add_location');
    expect(getPaymentsBadgeLabel('add_location')).toBe('Add location');
  });

  it('returns ready when agreement, connection, and locationId are complete', () => {
    const ready = status({
      agreementAccepted: true,
      connected: true,
      locationId: 'LOC1',
    });
    expect(getPaymentsReadinessPhase(ready)).toBe('ready');
    expect(getPaymentsBadgeLabel('ready')).toBe('Ready');
    expect(isPaymentsReady(ready)).toBe(true);
  });

  it('returns ready from locationSaved fallback when locationId is not yet on the payload', () => {
    const connected = status({ agreementAccepted: true, connected: true, locationId: null });
    expect(getPaymentsReadinessPhase(connected, true)).toBe('ready');
    expect(isPaymentsReady(connected, false)).toBe(false);
  });

  it('derives the active step from readiness phase', () => {
    expect(getActiveStep(status())).toBe(1);
    expect(getActiveStep(status({ agreementAccepted: true }))).toBe(2);
    expect(getActiveStep(status({ agreementAccepted: true, connected: true }))).toBe(3);
  });

  it('marks steps complete based on onboarding progress', () => {
    const connected = status({ agreementAccepted: true, connected: true });
    expect(isStepComplete(1, connected)).toBe(true);
    expect(isStepComplete(2, connected)).toBe(true);
    expect(isStepComplete(3, connected)).toBe(false);
    expect(isStepComplete(3, { ...connected, locationId: 'LOC1' })).toBe(true);
  });
});
