/**
 * Resolve the Square Web Payments SDK configuration for a checkout from relay
 * `/payment-config` (Connect Hub frontend-config per coach).
 */

import type { PaymentConfigResponse } from './api-client';

export type SquareConfigBlockedReason = 'COACH_LOCATION_MISSING' | 'PAYMENT_CONFIG_MISSING';

export interface SquareConfigSuccess {
  ok: true;
  applicationId: string;
  locationId: string;
  environment: 'production' | 'sandbox';
  sdkUrl: string;
}

export interface SquareConfigBlocked {
  ok: false;
  reason: SquareConfigBlockedReason;
}

export type ResolvedSquareConfig = SquareConfigSuccess | SquareConfigBlocked;

export function isSquareConfigReady(
  resolved: ResolvedSquareConfig,
): resolved is SquareConfigSuccess {
  return resolved.ok;
}

function sdkUrlFor(environment: 'production' | 'sandbox'): string {
  return environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';
}

export function resolveSquareConfig(cfg: PaymentConfigResponse | null): ResolvedSquareConfig {
  if (!cfg?.applicationId || cfg.provider !== 'relay') {
    return { ok: false, reason: 'PAYMENT_CONFIG_MISSING' };
  }

  const environment: 'production' | 'sandbox' =
    cfg.environment === 'production' ? 'production' : 'sandbox';
  const locationId = cfg.locationId?.trim() ?? '';
  if (!locationId) {
    return { ok: false, reason: 'COACH_LOCATION_MISSING' };
  }

  return {
    ok: true,
    applicationId: cfg.applicationId,
    locationId,
    environment,
    sdkUrl: sdkUrlFor(environment),
  };
}
