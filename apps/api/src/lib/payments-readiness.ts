/**
 * Owner payment readiness for DirectStream paywalls (Noctusoft store marketplace).
 */

import type { OwnerAccount } from '@prisma/client';

import { AppError } from './errors';

export type OwnerPaymentsReadinessInput = Pick<
  OwnerAccount,
  'marketplaceSellerKey' | 'paymentsConnectedAt'
>;

export type PaymentsReadiness = {
  ready: boolean;
  provider: 'store' | null;
  reason?: string;
};

/** Returns whether the owner can accept paid DirectStream checkouts. */
export function getOwnerPaymentsReadiness(owner: OwnerPaymentsReadinessInput): PaymentsReadiness {
  if (!owner.marketplaceSellerKey) {
    return { ready: false, provider: null, reason: 'Store seller onboarding is not started.' };
  }
  if (!owner.paymentsConnectedAt) {
    return { ready: false, provider: null, reason: 'Store seller onboarding is not complete.' };
  }
  return { ready: true, provider: 'store' };
}

export function wouldChargeViewers(paywallEnabled: boolean, priceInCents: number): boolean {
  return paywallEnabled && priceInCents > 0;
}

export function assertPaymentsReadyForPaywall(
  owner: OwnerPaymentsReadinessInput,
  paywallEnabled: boolean,
  priceInCents: number,
  opts?: { bypass?: boolean },
): void {
  if (opts?.bypass || !wouldChargeViewers(paywallEnabled, priceInCents)) {
    return;
  }

  const readiness = getOwnerPaymentsReadiness(owner);
  if (readiness.ready) {
    return;
  }

  const detail = readiness.reason ? ` ${readiness.reason}` : '';
  throw new AppError(
    'PAYMENTS_NOT_CONNECTED',
    `Connect payments at /owners/payments before enabling a paywall.${detail}`.trim(),
    400,
  );
}
