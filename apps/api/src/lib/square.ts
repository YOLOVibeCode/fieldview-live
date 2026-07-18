/**
 * Square Client
 * 
 * Initializes and exports Square client instance for payments.
 * Uses Square SDK for Checkout API with Apple Pay, Google Pay support.
 */

import crypto from 'crypto';

import { SquareClient, SquareEnvironment } from 'square';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';
const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';

// Square SDK v43+ uses `token` parameter directly (not bearerAuthCredentials)
export const squareClient = new SquareClient({
  token: SQUARE_ACCESS_TOKEN,
  environment: SQUARE_ENVIRONMENT,
});

export const squareLocationId = SQUARE_LOCATION_ID;

/**
 * Validate Square webhook signature.
 */
export function validateSquareWebhook(
  signature: string | undefined,
  body: string,
  webhookUrl: string
): boolean {
  if (!signature || !body || !webhookUrl || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    return false;
  }

  // Square spec: base64(HMAC-SHA256(signatureKey, notificationUrl + requestBody))
  const expected = crypto
    .createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
    .update(`${webhookUrl}${body}`)
    .digest('base64');

  // Constant-time compare
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
