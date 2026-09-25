import crypto from 'crypto';

import { describe, expect, it, vi } from 'vitest';

import { StoreClient, verifyStoreWebhookSignatures } from '../index';

describe('StoreClient', () => {
  it('formats store id as product@seller', () => {
    const client = new StoreClient({ baseUrl: 'https://store.test', productKey: 'fieldview', apiKey: 'k' });
    expect(client.storeId('team-1')).toBe('fieldview@team-1');
  });

  it('POST /v1/checkout with store alias', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ checkout_url: 'https://pay.test/session/1' }), { status: 200 }),
    );
    const client = new StoreClient(
      { baseUrl: 'https://store.test', productKey: 'fieldview', apiKey: 'k' },
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
    });
    expect(result.checkoutUrl).toBe('https://pay.test/session/1');
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ store: 'fieldview@owner-1' });
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
