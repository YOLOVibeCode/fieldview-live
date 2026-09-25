/**
 * Noctusoft store marketplace configuration and webhook verification.
 */

import crypto from 'crypto';

import { verifyStoreWebhookSignatures } from '@fieldview/store-client';

export interface MarketplaceConfig {
  storeBaseUrl: string;
  productKey: string;
  apiKey: string;
}

export function getMarketplaceConfig(): MarketplaceConfig {
  return {
    storeBaseUrl: process.env.NOCTUSOFT_STORE_BASE_URL || 'https://api.store.noctusoft.com',
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

/** Verify inbound store event v1 signatures (product + connect callback HMAC). */
export function verifyMarketplaceWebhookSignatures(
  rawBody: string,
  connectSignature: string | undefined,
  noctusoftSignature: string | undefined,
): boolean {
  return verifyStoreWebhookSignatures(rawBody, marketplaceWebhookCallbackUrl(), connectSignature, noctusoftSignature, {
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
