/**
 * Noctusoft store marketplace configuration and webhook verification.
 */

import crypto from 'crypto';

import { verifyStoreEventV1Signatures, verifyStoreWebhookSignatures } from '@fieldview/store-client';

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

export function marketplaceWebhookCallbackUrl(): string {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:4301';
  return (
    process.env.FIELDVIEW_WEBHOOK_CALLBACK_URL ||
    `${apiBase.replace(/\/$/, '')}/api/webhooks/marketplace`
  );
}

/**
 * Verify an inbound marketplace delivery. Event v1 (no `x-connect-signature`)
 * is signed with the Connect key, FIELDVIEW_WEBHOOK_SECRET; older deliveries
 * carry `x-connect-signature` plus a base64 `x-noctusoft-signature`.
 */
export function verifyMarketplaceWebhookSignatures(
  rawBody: string,
  headers: { connect?: string; noctusoft?: string; relay?: string },
): boolean {
  if (!headers.connect) {
    return verifyStoreEventV1Signatures(
      rawBody,
      marketplaceWebhookCallbackUrl(),
      { noctusoft: headers.noctusoft, relay: headers.relay },
      process.env.FIELDVIEW_WEBHOOK_SECRET || '',
    );
  }
  return verifyStoreWebhookSignatures(rawBody, marketplaceWebhookCallbackUrl(), headers.connect, headers.noctusoft, {
    connectSecret: process.env.FIELDVIEW_WEBHOOK_SECRET || '',
    noctusoftSecret: process.env.NOCTUSOFT_WEBHOOK_SECRET || process.env.NOCTUSOFT_API_KEY || '',
  });
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
  const expected = crypto.createHmac('sha256', secret).update(callbackUrl + rawBody).digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function resolveSellerKey(owner: { id: string; marketplaceSellerKey: string | null }): string {
  return owner.marketplaceSellerKey || owner.id;
}
