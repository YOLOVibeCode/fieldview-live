import crypto from 'crypto';

import { describe, expect, it, vi, afterEach } from 'vitest';

import { marketplaceWebhookCallbackUrl, verifyMarketplaceWebhookSignatures } from '../marketplace';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyMarketplaceWebhookSignatures', () => {
  it('validates connect + noctusoft signatures', () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
    vi.stubEnv('NOCTUSOFT_WEBHOOK_SECRET', 'product');
    vi.stubEnv('API_BASE_URL', 'https://api.fieldview.live');
    const url = marketplaceWebhookCallbackUrl();
    const body = '{"type":"marketplace.checkout.completed"}';
    const connect = crypto.createHmac('sha256', 'connect').update(url + body).digest('base64');
    const noctu = crypto.createHmac('sha256', 'product').update(body).digest('base64');
    expect(verifyMarketplaceWebhookSignatures(body, connect, noctu)).toBe(true);
  });
});
