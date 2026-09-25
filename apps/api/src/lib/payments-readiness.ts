/**
 * Owner payment readiness for DirectStream paywalls (relay Connect Hub only).
 */

import type { OwnerAccount } from '@prisma/client';

import { AppError } from './errors';
import { isRelayConfigured } from './relay';

export type OwnerPaymentsReadinessInput = Pick<
  OwnerAccount,
  'relayRecipientKey' | 'agreementAcceptedVersion' | 'squareLocationId'
>;

export type PaymentsReadiness = {
  ready: boolean;
  provider: 'relay' | null;
  reason?: string;
};

/** Returns whether the owner can accept paid DirectStream checkouts. */
export function getOwnerPaymentsReadiness(owner: OwnerPaymentsReadinessInput): PaymentsReadiness {
  if (!isRelayConfigured()) {
    return {
      ready: false,
      provider: null,
      reason: 'Payments relay is not configured on this server.',
    };
  }
  if (!owner.relayRecipientKey) {
    return { ready: false, provider: null, reason: 'Square is not connected via the relay.' };
  }
  if (!owner.agreementAcceptedVersion) {
    return { ready: false, provider: null, reason: 'Recipient agreement has not been accepted.' };
  }
  if (!owner.squareLocationId) {
    return { ready: false, provider: null, reason: 'Square location ID is not configured.' };
  }

  return { ready: true, provider: 'relay' };
}

/** True when viewers would be charged (paywall on with a positive price). */
export function wouldChargeViewers(paywallEnabled: boolean, priceInCents: number): boolean {
  return paywallEnabled && priceInCents > 0;
}

/** Throws PAYMENTS_NOT_CONNECTED when enabling a paid paywall without readiness. */
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
