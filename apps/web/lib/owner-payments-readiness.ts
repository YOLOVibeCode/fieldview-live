import type { OwnerPaymentsStatus } from '@/lib/api-client';

export type PaymentsReadinessPhase = 'not_started' | 'onboarding' | 'ready';

export type PaymentsStep = 1 | 2;

const BADGE_LABELS: Record<PaymentsReadinessPhase, string> = {
  not_started: 'Not started',
  onboarding: 'Connect payments',
  ready: 'Ready',
};

export function getPaymentsReadinessPhase(status: OwnerPaymentsStatus): PaymentsReadinessPhase {
  if (status.connected && status.connectedAt) {
    return 'ready';
  }
  if (status.sellerKey) {
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
  return status.sellerKey ? 2 : 1;
}

export function isStepComplete(step: PaymentsStep, status: OwnerPaymentsStatus): boolean {
  if (step === 1) {
    return Boolean(status.sellerKey);
  }
  return status.connected;
}
