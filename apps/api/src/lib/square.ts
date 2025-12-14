/**
 * Square Client
 * 
 * Initializes and exports Square client instance for payments.
 * Uses Square SDK for Checkout API with Apple Pay, Google Pay support.
 */

import { SquareClient, SquareEnvironment } from 'square';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';

// Square SDK v43+ uses bearerAuthCredentials
// Type assertion needed due to SDK type definitions
export const squareClient = new SquareClient({
  bearerAuthCredentials: {
    accessToken: SQUARE_ACCESS_TOKEN,
  },
  environment: SQUARE_ENVIRONMENT,
} as never);

export const squareLocationId = SQUARE_LOCATION_ID;

/**
 * Validate Square webhook signature.
 */
export function validateSquareWebhook(
  _signature: string | undefined,
  _body: string,
  _webhookUrl: string
): boolean {
  // TODO: Implement Square webhook signature validation
  // For now, return true (should be implemented in production)
  return true;
}
