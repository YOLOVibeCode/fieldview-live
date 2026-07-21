/**
 * Resolve the Square Web Payments SDK configuration for a checkout.
 *
 * When the purchase's recipient coach is connected via the relay Connect Hub, use
 * the per-coach `application_id`/`environment` from the relay (`/payment-config`),
 * falling back to the legacy `NEXT_PUBLIC_SQUARE_*` env when not (or when the relay
 * doesn't return the coach's `locationId`, which it never does).
 *
 * Pure function — unit tested in `__tests__/square-config.test.ts`.
 */

import type { PaymentConfigResponse } from './api-client';

export interface ResolvedSquareConfig {
  applicationId: string;
  locationId: string;
  environment: 'production' | 'sandbox';
  sdkUrl: string;
}

function sdkUrlFor(environment: 'production' | 'sandbox'): string {
  return environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';
}

export function resolveSquareConfig(cfg: PaymentConfigResponse | null): ResolvedSquareConfig {
  const legacyAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const legacyLocation = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const legacyEnv: 'production' | 'sandbox' =
    (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';

  const useRelay = cfg?.provider === 'relay' && !!cfg.applicationId;
  if (!useRelay) {
    return { applicationId: legacyAppId, locationId: legacyLocation, environment: legacyEnv, sdkUrl: sdkUrlFor(legacyEnv) };
  }

  const environment: 'production' | 'sandbox' = cfg.environment === 'production' ? 'production' : 'sandbox';
  // The relay does not return the coach's location; fall back to the env value.
  const locationId = cfg.locationId ? cfg.locationId : legacyLocation;
  return { applicationId: cfg.applicationId as string, locationId, environment, sdkUrl: sdkUrlFor(environment) };
}
