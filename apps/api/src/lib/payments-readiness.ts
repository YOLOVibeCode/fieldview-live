/**
 * Owner payment readiness for DirectStream paywalls.
 * Supports relay Connect Hub onboarding and legacy Model A tokens.
 */

import type { OwnerAccount } from '@prisma/client';

import { AppError } from './errors';
import { isPaymentsViaRelay } from './relay';

export type OwnerPaymentsReadinessInput = Pick<
  OwnerAccount,
  | 'relayRecipientKey'
  | 'agreementAcceptedVersion'
  | 'squareLocationId'
  | 'squareAccessTokenEncrypted'
  | 'squareTokenExpiresAt'
>;

export type PaymentsReadiness = {
  ready: boolean;
  provider: 'relay' | 'legacy' | null;
  reason?: string;
};

function isLegacyTokenExpired(squareTokenExpiresAt: Date | null): boolean {
  return squareTokenExpiresAt !== null && new Date(squareTokenExpiresAt) < new Date();
}

function getRelayReadiness(owner: OwnerPaymentsReadinessInput): PaymentsReadiness | null {
  if (!isPaymentsViaRelay()) {
    return null;
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

function getLegacyReadiness(owner: OwnerPaymentsReadinessInput): PaymentsReadiness {
  if (!owner.squareAccessTokenEncrypted) {
    return { ready: false, provider: null, reason: 'Square account is not connected.' };
  }
  if (!owner.squareLocationId) {
    return { ready: false, provider: null, reason: 'Square location ID is not configured.' };
  }
  if (isLegacyTokenExpired(owner.squareTokenExpiresAt)) {
    return { ready: false, provider: null, reason: 'Square token has expired.' };
  }

  return { ready: true, provider: 'legacy' };
}

/** Returns whether the owner can accept paid DirectStream checkouts. */
export function getOwnerPaymentsReadiness(owner: OwnerPaymentsReadinessInput): PaymentsReadiness {
  const relay = getRelayReadiness(owner);
  if (relay?.ready) {
    return relay;
  }

  const legacy = getLegacyReadiness(owner);
  if (legacy.ready) {
    return legacy;
  }

  return relay ?? legacy;
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
