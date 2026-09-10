/**
 * Resolve the Square Web Payments SDK configuration for a checkout.
 *
 * When the purchase's recipient coach is connected via the relay Connect Hub, use
 * the per-coach `application_id`/`environment`/`locationId` from the relay
 * (`/payment-config`). Legacy `NEXT_PUBLIC_SQUARE_*` env is used only when the
 * owner is not on relay or provider is explicitly legacy.
 *
 * Pure function — unit tested in `__tests__/square-config.test.ts`.
 */

import type { PaymentConfigResponse } from './api-client';

export type SquareConfigBlockedReason = 'COACH_LOCATION_MISSING';

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

function legacyConfig(): SquareConfigSuccess {
  const legacyAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const legacyLocation = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const legacyEnv: 'production' | 'sandbox' =
    (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
      ? 'production'
      : 'sandbox';
  return {
    ok: true,
    applicationId: legacyAppId,
    locationId: legacyLocation,
    environment: legacyEnv,
    sdkUrl: sdkUrlFor(legacyEnv),
  };
}

export function resolveSquareConfig(cfg: PaymentConfigResponse | null): ResolvedSquareConfig {
  const useRelay = cfg?.provider === 'relay' && !!cfg.applicationId;
  if (!useRelay) {
    return legacyConfig();
  }

  const environment: 'production' | 'sandbox' =
    cfg.environment === 'production' ? 'production' : 'sandbox';
  const locationId = cfg.locationId?.trim() ?? '';
  if (!locationId) {
    return { ok: false, reason: 'COACH_LOCATION_MISSING' };
  }

  return {
    ok: true,
    applicationId: cfg.applicationId as string,
    locationId,
    environment,
    sdkUrl: sdkUrlFor(environment),
  };
}
