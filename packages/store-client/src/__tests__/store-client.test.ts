import crypto from 'crypto';

import { describe, expect, it, vi } from 'vitest';

import { StoreClient, signConnectBuyLink, verifyStoreWebhookSignatures } from '../index';

describe('StoreClient', () => {
  it('formats store id as product@seller', () => {
    const client = new StoreClient({ baseUrl: 'https://store.test', productKey: 'fieldview', apiKey: 'k' });
    expect(client.storeId('team-1')).toBe('fieldview@team-1');
  });

  it('mints a signed /buy/connect/:product/:seller URL', async () => {
    const fetchFn = vi.fn();
    const client = new StoreClient(
      {
        baseUrl: 'https://store.noctusoft.com',
        productKey: 'fieldview',
        apiKey: 'k',
        signingSecret: 'whsec_connect',
      },
      fetchFn as unknown as typeof fetch,
    );
    const result = await client.createCheckout({
      sellerKey: 'owner-1',
      amountCents: 500,
      currency: 'USD',
      referenceId: 'purchase-1',
      idempotencyKey: 'purchase-1',
      successUrl: 'https://fieldview.live/ok',
      cancelUrl: 'https://fieldview.live/cancel',
      buyerEmail: 'fan@example.com',
    });
    expect(result.checkoutUrl).toMatch(
      /^https:\/\/store\.noctusoft\.com\/buy\/connect\/fieldview\/owner-1\?/,
    );
    expect(result.checkoutUrl).toContain('amount=500');
    expect(result.checkoutUrl).toContain('user=purchase-1');
    expect(result.checkoutUrl).toContain('sig=');
    expect(result.checkoutId).toMatch(/^buy:/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('signConnectBuyLink', () => {
  it('includes amount and seller in the path', () => {
    const { url } = signConnectBuyLink({
      secret: 's',
      product: 'fieldview',
      seller: 's1',
      amountCents: 999,
      baseUrl: 'https://store.noctusoft.com',
    });
    expect(url).toContain('/buy/connect/fieldview/s1?');
    expect(url).toContain('amount=999');
  });
});

describe('verifyStoreWebhookSignatures', () => {
  const url = 'https://api.fieldview.live/api/webhooks/marketplace';
  const body = '{"type":"marketplace.checkout.completed"}';
  const connect = (secret: string) => crypto.createHmac('sha256', secret).update(url + body).digest('base64');
  const noctu = (secret: string) => crypto.createHmac('sha256', secret).update(body).digest('base64');

  it('accepts valid dual signatures', () => {
    expect(
      verifyStoreWebhookSignatures(body, url, connect('c'), noctu('n'), {
        connectSecret: 'c',
        noctusoftSecret: 'n',
      }),
    ).toBe(true);
  });

  it('rejects missing headers', () => {
    expect(
      verifyStoreWebhookSignatures(body, url, undefined, noctu('n'), {
        connectSecret: 'c',
        noctusoftSecret: 'n',
      }),
    ).toBe(false);
  });
});
