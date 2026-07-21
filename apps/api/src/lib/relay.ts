/**
 * Noctusoft Relay — Square Connect Hub config.
 *
 * FieldView routes all Square marketplace traffic through the relay's Connect Hub
 * (`<baseUrl>/connect/<product>/*`). The relay holds every coach's Square OAuth
 * tokens and performs the 90/10 split via `app_fee_money`, so this repo holds NO
 * Square secrets — only the relay deploy key. See docs/RELAY-CONNECT-HUB-MIGRATION.md.
 */

import crypto from 'crypto';

/**
 * Verify a relay-forwarded webhook. The relay re-signs each event with the
 * product's own secret: base64( HMAC-SHA256( FIELDVIEW_WEBHOOK_SECRET, callbackUrl + rawBody ) ),
 * delivered in the `x-connect-signature` header. Constant-time compared.
 */
export function verifyRelaySignature(
  signature: string | undefined,
  rawBody: string,
  callbackUrl: string,
): boolean {
  const secret = process.env.FIELDVIEW_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(callbackUrl + rawBody).digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface RelayConfig {
  /** e.g. https://api.square.noctusoft.com */
  baseUrl: string;
  /** Connect Hub product key, e.g. "fieldview" */
  productKey: string;
  /** Relay deploy key (`nsins_dk_...`), sent as `Authorization: Bearer`. */
  apiKey: string;
}

export function getRelayConfig(): RelayConfig {
  return {
    baseUrl: process.env.NOCTUSOFT_RELAY_SQUARE_BASE_URL || 'https://api.square.noctusoft.com',
    productKey: process.env.NOCTUSOFT_PRODUCT_KEY || 'fieldview',
    apiKey: process.env.NOCTUSOFT_API_KEY || '',
  };
}

/** True once the relay deploy key is configured (Slice 0 provisioning done). */
export function isRelayConfigured(): boolean {
  return (process.env.NOCTUSOFT_API_KEY || '').length > 0;
}

/**
 * Feature flag: route viewer checkout through the relay Connect Hub instead of the
 * legacy in-repo Square "Model A". Default OFF. Only takes effect for owners that
 * have completed relay onboarding (have a relayRecipientKey).
 */
export function isPaymentsViaRelay(): boolean {
  return process.env.PAYMENTS_VIA_RELAY === 'true';
}
