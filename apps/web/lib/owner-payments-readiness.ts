import type { OwnerPaymentsStatus } from '@/lib/api-client';

const LOCATION_SAVED_SESSION_KEY = 'owner_payments_location_saved';

export function markLocationSavedInSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LOCATION_SAVED_SESSION_KEY, '1');
  }
}

export function readLocationSavedFromSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(LOCATION_SAVED_SESSION_KEY) === '1';
}

export type PaymentsReadinessPhase =
  | 'not_started'
  | 'agreement_needed'
  | 'connect_square'
  | 'add_location'
  | 'ready';

export type PaymentsStep = 1 | 2 | 3;

const BADGE_LABELS: Record<PaymentsReadinessPhase, string> = {
  not_started: 'Not started',
  agreement_needed: 'Agreement needed',
  connect_square: 'Connect Square',
  add_location: 'Add location',
  ready: 'Ready',
};

export function getPaymentsReadinessPhase(
  status: OwnerPaymentsStatus,
  locationSaved: boolean,
): PaymentsReadinessPhase {
  if (status.agreementAccepted && status.connected && locationSaved) {
    return 'ready';
  }
  if (!status.agreementAccepted) {
    return status.connected ? 'agreement_needed' : 'not_started';
  }
  if (!status.connected) {
    return 'connect_square';
  }
  return 'add_location';
}

export function getPaymentsBadgeLabel(phase: PaymentsReadinessPhase): string {
  return BADGE_LABELS[phase];
}

export function isPaymentsReady(status: OwnerPaymentsStatus, locationSaved: boolean): boolean {
  return getPaymentsReadinessPhase(status, locationSaved) === 'ready';
}

export function getActiveStep(status: OwnerPaymentsStatus, locationSaved: boolean): PaymentsStep {
  const phase = getPaymentsReadinessPhase(status, locationSaved);
  if (phase === 'not_started' || phase === 'agreement_needed') {
    return 1;
  }
  if (phase === 'connect_square') {
    return 2;
  }
  return 3;
}

export function isStepComplete(
  step: PaymentsStep,
  status: OwnerPaymentsStatus,
  locationSaved: boolean,
): boolean {
  if (step === 1) {
    return status.agreementAccepted;
  }
  if (step === 2) {
    return status.connected;
  }
  return locationSaved;
}
