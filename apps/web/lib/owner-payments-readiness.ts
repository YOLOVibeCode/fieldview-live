import type { OwnerPaymentsStatus } from '@/lib/api-client';

export type PaymentsReadinessPhase = 'not_started' | 'onboarding' | 'ready';

/** 1 = accept the Recipient Agreement, 2 = connect payouts on the provider's form. */
export type PaymentsStep = 1 | 2;

const BADGE_LABELS: Record<PaymentsReadinessPhase, string> = {
  not_started: 'Not started',
  onboarding: 'Connect payments',
  ready: 'Ready',
};

/** Step 1 is done. An older status without the field counts a seller key as started. */
export function isAgreementAccepted(status: OwnerPaymentsStatus): boolean {
  if (typeof status.agreementAccepted === 'boolean') {
    return status.agreementAccepted;
  }
  return Boolean(status.sellerKey);
}

export function getPaymentsReadinessPhase(status: OwnerPaymentsStatus): PaymentsReadinessPhase {
  if (status.connected) {
    return 'ready';
  }
  if (isAgreementAccepted(status)) {
    return 'onboarding';
  }
  return 'not_started';
}

export function getPaymentsBadgeLabel(phase: PaymentsReadinessPhase): string {
  return BADGE_LABELS[phase];
}

export function isPaymentsReady(status: OwnerPaymentsStatus): boolean {
  return getPaymentsReadinessPhase(status) === 'ready';
}

export function getActiveStep(status: OwnerPaymentsStatus): PaymentsStep {
  return isAgreementAccepted(status) ? 2 : 1;
}

export function isStepComplete(step: PaymentsStep, status: OwnerPaymentsStatus): boolean {
  if (step === 1) {
    return isAgreementAccepted(status);
  }
  return status.connected;
}

/**
 * The paywall checkbox in the owner console. A coach whose payments aren't ready
 * can't turn the paywall on, but can always turn an active paywall off.
 */
export function isPaywallToggleDisabled(paymentsReady: boolean, paywallOn: boolean): boolean {
  return !paymentsReady && !paywallOn;
}
