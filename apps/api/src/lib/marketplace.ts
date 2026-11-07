/**
 * Noctusoft store marketplace: configuration, the Connect signing key, and
 * inbound webhook verification.
 *
 * The HTTP contract itself lives in @noctusoft/store-client — the relay's own
 * client, vendored in packages/store-client (see VENDORED.md there).
 */

import crypto from 'crypto';

import { verifyWebhook } from '@noctusoft/store-client';

export interface MarketplaceConfig {
  storeBaseUrl: string;
  productKey: string;
  apiKey: string;
}

export function getMarketplaceConfig(): MarketplaceConfig {
  return {
    storeBaseUrl: process.env.NOCTUSOFT_STORE_BASE_URL || 'https://store.noctusoft.com',
    productKey: process.env.NOCTUSOFT_PRODUCT_KEY || 'fieldview',
    apiKey: process.env.NOCTUSOFT_API_KEY || '',
  };
}

export function isMarketplaceConfigured(): boolean {
  return (process.env.NOCTUSOFT_API_KEY || '').length > 0;
}

/**
 * The product's Connect signing key on the relay. It signs the buy links
 * FieldView mints and the event v1 deliveries the relay sends back.
 */
export function marketplaceSigningSecret(): string {
  return process.env.FIELDVIEW_WEBHOOK_SECRET || process.env.NOCTUSOFT_WEBHOOK_SECRET || '';
}

export function marketplaceWebhookCallbackUrl(): string {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:4301';
  return (
    process.env.FIELDVIEW_WEBHOOK_CALLBACK_URL ||
    `${apiBase.replace(/\/$/, '')}/api/webhooks/marketplace`
  );
}

function hmacBase64(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify an inbound marketplace delivery.
 *
 * Event v1 (no `x-connect-signature`) is what the relay sends today: it carries
 * `x-noctusoft-signature` (hex HMAC of the body) and `x-relay-signature` (base64
 * HMAC of callbackUrl + body), both with the Connect key, FIELDVIEW_WEBHOOK_SECRET.
 * The relay's own verifier checks them: every present signature must verify and
 * at least one must be present.
 *
 * Older deliveries carried `x-connect-signature` (Connect key, base64 over
 * callbackUrl + body) plus a base64 `x-noctusoft-signature` over the body with the
 * product key; both must verify.
 */
export function verifyMarketplaceWebhookSignatures(
  rawBody: string,
  headers: { connect?: string; noctusoft?: string; relay?: string },
): boolean {
  const callbackUrl = marketplaceWebhookCallbackUrl();
  const connectSecret = process.env.FIELDVIEW_WEBHOOK_SECRET || '';
  if (!connectSecret) {
    return false;
  }

  if (!headers.connect) {
    const result = verifyWebhook({
      secret: connectSecret,
      body: rawBody,
      callbackUrl,
      headers: {
        'x-noctusoft-signature': headers.noctusoft ?? '',
        'x-relay-signature': headers.relay ?? '',
      },
    });
    return result.ok;
  }

  const noctusoftSecret = process.env.NOCTUSOFT_WEBHOOK_SECRET || process.env.NOCTUSOFT_API_KEY || '';
  if (!headers.noctusoft || !noctusoftSecret) {
    return false;
  }
  return (
    timingSafeEqual(headers.connect, hmacBase64(connectSecret, callbackUrl + rawBody)) &&
    timingSafeEqual(headers.noctusoft, hmacBase64(noctusoftSecret, rawBody))
  );
}

/** @deprecated alias kept for tests migrating off relay naming */
export function verifyRelaySignature(
  signature: string | undefined,
  rawBody: string,
  callbackUrl: string,
): boolean {
  const secret = process.env.FIELDVIEW_WEBHOOK_SECRET || '';
  if (!secret || !signature) {
    return false;
  }
  return timingSafeEqual(signature, hmacBase64(secret, callbackUrl + rawBody));
}

export function resolveSellerKey(owner: { id: string; marketplaceSellerKey: string | null }): string {
  return owner.marketplaceSellerKey || owner.id;
}
