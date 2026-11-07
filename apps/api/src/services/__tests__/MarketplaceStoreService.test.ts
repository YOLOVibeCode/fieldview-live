/**
 * Contract tests: FieldView's marketplace adapter must speak the relay's Connect Hub
 * contract (noctusoft-relay docs/api/store/README.md, "Marketplace"). The fake relay
 * below answers ONLY the documented routes, so any invented path fails loudly.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed `any` */

import crypto from 'crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../lib/errors';
import { MarketplaceStoreService } from '../MarketplaceStoreService';

const config = { storeBaseUrl: 'https://store.test', productKey: 'fieldview', apiKey: 'nsk_test_key' };
const SELLER = '/connect/fieldview/recipients/owner-1';
const SECRET = 'connect-signing-key';

interface Call {
  url: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | undefined;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A fake relay that answers only the documented Connect Hub routes. */
function fakeRelay(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const respond = (input: RequestInfo | URL, init?: RequestInit): Response => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    const rawHeaders = (init?.headers as Record<string, string> | undefined) || {};
    const headers = Object.fromEntries(Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v]));
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    const path = new URL(url).pathname;
    const call: Call = { url, path, method, headers, body };
    calls.push(call);
    const handler = routes[`${method} ${path}`];
    if (!handler) return json(404, { code: 'NOT_FOUND', error: `The relay has no route ${method} ${path}` });
    return handler(call);
  };
  const fetchFn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(respond(input, init)));
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

const sellerView = (over: Record<string, unknown> = {}) => ({
  sellerKey: 'owner-1',
  sellerRef: 'sel_1',
  mode: 'live',
  status: 'active',
  chargesEnabled: true,
  payoutsEnabled: true,
  agreementVersion: 'v1',
  agreementAcceptedAt: '2026-11-07T00:00:00.000Z',
  ...over,
});

function service(fetchFn: typeof fetch, over: Partial<typeof config> = {}) {
  return new MarketplaceStoreService({ ...config, ...over }, fetchFn);
}

beforeEach(() => {
  vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MarketplaceStoreService (relay Connect Hub contract)', () => {
  it('sends the relay key as x-api-key', async () => {
    const relay = fakeRelay({ [`GET ${SELLER}`]: () => json(200, sellerView()) });
    await service(relay.fetchFn).getSellerStatus('owner-1');
    expect(relay.calls[0]?.headers['x-api-key']).toBe('nsk_test_key');
  });

  it('refuses to run without a relay key instead of calling the relay', async () => {
    const relay = fakeRelay({});
    await expect(service(relay.fetchFn, { apiKey: '' }).getSellerStatus('owner-1')).rejects.toMatchObject({
      code: 'STORE_NOT_CONFIGURED',
      statusCode: 503,
    });
    expect(relay.calls).toHaveLength(0);
  });

  describe('acceptAgreement', () => {
    it('POSTs …/recipients/:seller/agreement with agreement_version', async () => {
      const relay = fakeRelay({
        [`POST ${SELLER}/agreement`]: (call) =>
          json(200, {
            recipient_key: 'owner-1',
            agreement_accepted_at: 1_762_473_600,
            agreement_version_accepted: call.body?.agreement_version,
          }),
      });
      const result = await service(relay.fetchFn).acceptAgreement('owner-1', 'v1');
      expect(relay.calls[0]?.body).toEqual({ agreement_version: 'v1' });
      expect(result).toEqual({ version: 'v1', acceptedAt: expect.any(String) });
    });
  });

  describe('buildOnboardingUrl', () => {
    it('POSTs …/recipients/:seller/onboard and returns the relay link', async () => {
      const relay = fakeRelay({
        [`POST ${SELLER}/onboard`]: () =>
          json(200, { url: 'https://store.test/connect/fieldview/onboard?state=abc', expiresAt: '2026-11-08T00:00:00Z' }),
      });
      const url = await service(relay.fetchFn).buildOnboardingUrl('owner-1', 'https://fieldview.live/owners/payments', {
        email: 'coach@example.com',
        productDescription: 'Paid live-stream access on FieldView.Live',
      });
      expect(url).toBe('https://store.test/connect/fieldview/onboard?state=abc');
      expect(relay.calls[0]?.body).toEqual({
        returnUrl: 'https://fieldview.live/owners/payments',
        email: 'coach@example.com',
        productDescription: 'Paid live-stream access on FieldView.Live',
      });
    });

    it('surfaces the relay refusal when the agreement is not accepted (428 AGREEMENT_REQUIRED)', async () => {
      const relay = fakeRelay({
        [`POST ${SELLER}/onboard`]: () =>
          json(428, { code: 'AGREEMENT_REQUIRED', error: 'The seller must accept the marketplace agreement first.' }),
      });
      const err = await service(relay.fetchFn)
        .buildOnboardingUrl('owner-1', 'https://fieldview.live/owners/payments')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toMatchObject({ code: 'AGREEMENT_REQUIRED', statusCode: 428 });
    });
  });

  describe('getSellerStatus', () => {
    it('GETs …/recipients/:seller and maps a charges-enabled seller to connected', async () => {
      const relay = fakeRelay({ [`GET ${SELLER}`]: () => json(200, sellerView()) });
      const status = await service(relay.fetchFn).getSellerStatus('owner-1');
      expect(relay.calls[0]?.method).toBe('GET');
      expect(status).toEqual({
        exists: true,
        connected: true,
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        sellerRef: 'sel_1',
        mode: 'live',
        agreementAccepted: true,
        agreementVersion: 'v1',
        agreementAcceptedAt: '2026-11-07T00:00:00.000Z',
      });
    });

    it('is not connected while the seller is pending at the provider', async () => {
      const relay = fakeRelay({
        [`GET ${SELLER}`]: () => json(200, sellerView({ status: 'pending', chargesEnabled: false, payoutsEnabled: false })),
      });
      const status = await service(relay.fetchFn).getSellerStatus('owner-1');
      expect(status.exists).toBe(true);
      expect(status.connected).toBe(false);
      expect(status.agreementAccepted).toBe(true);
    });

    it('is "not started" when the relay has no recipient yet (404), without throwing', async () => {
      const relay = fakeRelay({
        [`GET ${SELLER}`]: () => json(404, { code: 'RECIPIENT_NOT_FOUND', error: 'no recipient: owner-1' }),
      });
      const status = await service(relay.fetchFn).getSellerStatus('owner-1');
      expect(status).toMatchObject({ exists: false, connected: false, agreementAccepted: false, status: null });
    });
  });

  describe('createCheckout (signed buy link)', () => {
    const input = {
      sellerKey: 'owner-1',
      amountCents: 500,
      currency: 'USD',
      purchaseId: 'purchase-1',
      successUrl: 'https://fieldview.live/checkout/purchase-1/success',
      cancelUrl: 'https://fieldview.live/checkout/purchase-1/payment?cancelled=1',
      buyerEmail: 'parent@example.com',
      description: 'TCHS vs Rivals',
    };

    it('mints /buy/connect/:product/:seller with the amount, buyer, return and description inside the signature', async () => {
      const relay = fakeRelay({});
      const result = await service(relay.fetchFn).createCheckout(input);
      const url = new URL(result.checkoutUrl);
      expect(url.origin).toBe('https://store.test');
      expect(url.pathname).toBe('/buy/connect/fieldview/owner-1');
      const q = url.searchParams;
      expect(q.get('amount')).toBe('500');
      expect(q.get('currency')).toBe('USD');
      expect(q.get('user')).toBe('purchase-1');
      expect(q.get('email')).toBe('parent@example.com');
      expect(q.get('return')).toBe(input.successUrl);
      expect(q.get('desc')).toBe('TCHS vs Rivals');
      // The relay verifies: HMAC-SHA256(secret, "buy-link-v1|connect-desc|product|seller|amount|currency|user|email|return|exp|nonce|desc")
      const mac = [
        'buy-link-v1',
        'connect-desc',
        'fieldview',
        'owner-1',
        '500',
        'USD',
        'purchase-1',
        'parent@example.com',
        input.successUrl,
        q.get('exp'),
        q.get('nonce'),
        'TCHS vs Rivals',
      ].join('|');
      expect(q.get('sig')).toBe(crypto.createHmac('sha256', SECRET).update(mac).digest('hex'));
      expect(result.checkoutId).toBe(`buy:${q.get('nonce')}`);
      expect(result.paymentId).toBeNull();
      expect(relay.calls).toHaveLength(0); // a link, not a relay call
    });

    it('signs under the plain connect tag when there is no description', async () => {
      const relay = fakeRelay({});
      const result = await service(relay.fetchFn).createCheckout({ ...input, description: undefined });
      const q = new URL(result.checkoutUrl).searchParams;
      expect(q.has('desc')).toBe(false);
      const mac = [
        'buy-link-v1',
        'connect',
        'fieldview',
        'owner-1',
        '500',
        'USD',
        'purchase-1',
        'parent@example.com',
        input.successUrl,
        q.get('exp'),
        q.get('nonce'),
      ].join('|');
      expect(q.get('sig')).toBe(crypto.createHmac('sha256', SECRET).update(mac).digest('hex'));
    });

    it('refuses a checkout without the buyer email (the relay refuses such links at the click)', async () => {
      const relay = fakeRelay({});
      await expect(service(relay.fetchFn).createCheckout({ ...input, buyerEmail: undefined })).rejects.toMatchObject({
        code: 'BUYER_EMAIL_REQUIRED',
        statusCode: 400,
      });
    });

    it('refuses a checkout when the signing secret is not configured', async () => {
      vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', '');
      vi.stubEnv('NOCTUSOFT_WEBHOOK_SECRET', '');
      const relay = fakeRelay({});
      await expect(service(relay.fetchFn).createCheckout(input)).rejects.toMatchObject({ code: 'STORE_NOT_CONFIGURED' });
    });
  });

  describe('refund', () => {
    it('POSTs …/recipients/:seller/refunds with paymentRef, amountCents and idempotencyKey', async () => {
      const relay = fakeRelay({
        [`POST ${SELLER}/refunds`]: (call) =>
          json(200, { refundRef: 'ref_1', paymentRef: call.body?.paymentRef, status: 'succeeded', amountCents: call.body?.amountCents }),
      });
      await service(relay.fetchFn).refund({
        sellerKey: 'owner-1',
        paymentId: 'pay_1',
        amountCents: 500,
        refundId: 'refund-1',
        reason: 'Stream cancelled',
      });
      expect(relay.calls[0]?.body).toEqual({
        paymentRef: 'pay_1',
        amountCents: 500,
        idempotencyKey: 'refund-refund-1',
        reason: 'Stream cancelled',
      });
    });

    it('surfaces a relay refusal with its code', async () => {
      const relay = fakeRelay({
        [`POST ${SELLER}/refunds`]: () => json(404, { code: 'NOT_FOUND', error: 'payment not found' }),
      });
      await expect(
        service(relay.fetchFn).refund({ sellerKey: 'owner-1', paymentId: 'pay_x', amountCents: 500, refundId: 'r' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    });
  });

  it('never calls a path the relay does not document', async () => {
    const relay = fakeRelay({
      [`POST ${SELLER}/agreement`]: () => json(200, { recipient_key: 'owner-1', agreement_accepted_at: 1, agreement_version_accepted: 'v1' }),
      [`POST ${SELLER}/onboard`]: () => json(200, { url: 'https://store.test/x', expiresAt: 'x' }),
      [`GET ${SELLER}`]: () => json(200, sellerView()),
      [`POST ${SELLER}/refunds`]: () => json(200, { refundRef: 'r', paymentRef: 'p', status: 'succeeded', amountCents: 1 }),
    });
    const svc = service(relay.fetchFn);
    await svc.acceptAgreement('owner-1', 'v1');
    await svc.buildOnboardingUrl('owner-1', 'https://fieldview.live/owners/payments');
    await svc.getSellerStatus('owner-1');
    await svc.refund({ sellerKey: 'owner-1', paymentId: 'p', amountCents: 1, refundId: 'r' });
    expect(relay.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      `POST ${SELLER}/agreement`,
      `POST ${SELLER}/onboard`,
      `GET ${SELLER}`,
      `POST ${SELLER}/refunds`,
    ]);
    for (const c of relay.calls) {
      expect(c.path).not.toContain('/v1/');
      expect(c.path).not.toContain('/sellers/');
    }
  });
});
