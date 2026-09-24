import type { OwnerPaymentsStatus } from '@/lib/api-client';

export type PaymentsReadinessPhase =
  | 'not_started'
  | 'agreement_needed'
  | 'connect_stripe'
  | 'add_location'
  | 'ready';

export type PaymentsStep = 1 | 2 | 3;

const BADGE_LABELS: Record<PaymentsReadinessPhase, string> = {
  not_started: 'Not started',
  agreement_needed: 'Agreement needed',
  connect_stripe: 'Connect Stripe',
  add_location: 'Add location',
  ready: 'Ready',
};

function requiresLocation(status: OwnerPaymentsStatus): boolean {
  return status.requiresLocationId !== false;
}

export function hasSavedLocation(
  status: OwnerPaymentsStatus,
  locationSavedFallback = false,
): boolean {
  if (!requiresLocation(status)) {
    return true;
  }
  return Boolean(status.locationId?.trim()) || locationSavedFallback;
}

export function getPaymentsReadinessPhase(
  status: OwnerPaymentsStatus,
  locationSavedFallback = false,
): PaymentsReadinessPhase {
  const locationSaved = hasSavedLocation(status, locationSavedFallback);
  if (status.agreementAccepted && status.connected && locationSaved) {
    return 'ready';
  }
  if (!status.agreementAccepted) {
    return status.connected ? 'agreement_needed' : 'not_started';
  }
  if (!status.connected) {
    return 'connect_stripe';
  }
  return 'add_location';
}

export function getPaymentsBadgeLabel(phase: PaymentsReadinessPhase): string {
  return BADGE_LABELS[phase];
}

export function isPaymentsReady(
  status: OwnerPaymentsStatus,
  locationSavedFallback = false,
): boolean {
  return getPaymentsReadinessPhase(status, locationSavedFallback) === 'ready';
}

export function getActiveStep(
  status: OwnerPaymentsStatus,
  locationSavedFallback = false,
): PaymentsStep {
  const phase = getPaymentsReadinessPhase(status, locationSavedFallback);
  if (phase === 'not_started' || phase === 'agreement_needed') {
    return 1;
  }
  if (phase === 'connect_stripe') {
    return 2;
  }
  return 3;
}

export function isStepComplete(
  step: PaymentsStep,
  status: OwnerPaymentsStatus,
  locationSavedFallback = false,
): boolean {
  if (step === 1) {
    return status.agreementAccepted;
  }
  if (step === 2) {
    return status.connected;
  }
  return hasSavedLocation(status, locationSavedFallback);
}

export function visibleSteps(status: OwnerPaymentsStatus): PaymentsStep[] {
  if (!requiresLocation(status)) {
    return [1, 2];
  }
  return [1, 2, 3];
}
