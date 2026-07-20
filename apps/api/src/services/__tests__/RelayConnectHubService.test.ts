/**
 * RelayConnectHubService tests.
 *
 * The relay is mocked via an injected fetch function — no network. Request/response
 * shapes mirror the relay's INTEGRATION.md + captured production canary (2026-07-19).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RelayConnectHubService } from '../RelayConnectHubService';
import type { RelayConfig } from '../../lib/relay';

const config: RelayConfig = {
  baseUrl: 'https://relay.test',
  productKey: 'fieldview',
  apiKey: 'nsins_dk_test',
};

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

describe('RelayConnectHubService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let svc: RelayConnectHubService;

  beforeEach(() => {
    fetchFn = vi.fn();
    svc = new RelayConnectHubService(config, fetchFn as unknown as typeof globalThis.fetch);
  });

  describe('buildAuthorizeUrl', () => {
    it('builds the Connect Hub authorize URL with recipient_key (no network)', () => {
      const url = svc.buildAuthorizeUrl('owner-123', 'https://app.fieldview.live/owners/dashboard');
      const parsed = new URL(url);
      expect(`${parsed.origin}${parsed.pathname}`).toBe('https://relay.test/connect/fieldview/oauth/authorize');
      expect(parsed.searchParams.get('recipient_key')).toBe('owner-123');
      expect(parsed.searchParams.get('redirect')).toBe('https://app.fieldview.live/owners/dashboard');
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('acceptAgreement', () => {
    it('POSTs agreement_version (+ ip) and parses agreement_version_accepted', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({ recipient_key: 'owner-123', agreement_version_accepted: 'v1', agreement_accepted_at: 1784445133 }),
      );
      const result = await svc.acceptAgreement('owner-123', 'v1', '1.2.3.4');

      const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123/agreement');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer nsins_dk_test');
      expect(JSON.parse(init.body as string)).toEqual({ agreement_version: 'v1', ip: '1.2.3.4' });
      expect(result).toEqual({ accepted: true, version: 'v1', acceptedAt: 1784445133 });
    });

    it('surfaces the relay error code on a stale agreement (428)', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ error: 'stale', code: 'AGREEMENT_STALE' }, false, 428));
      await expect(svc.acceptAgreement('owner-123', 'v0')).rejects.toThrow(/AGREEMENT_STALE/);
    });
  });

  describe('getFrontendConfig', () => {
    it('maps application_id + environment', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ application_id: 'sq0idp-abc', environment: 'production' }));
      const cfg = await svc.getFrontendConfig('owner-123');
      expect(cfg).toEqual({ applicationId: 'sq0idp-abc', environment: 'production' });
    });

    it('defaults environment to sandbox', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ application_id: 'sandbox-sq0idb-x' }));
      expect((await svc.getFrontendConfig('owner-123')).environment).toBe('sandbox');
    });

    it('throws when application_id is missing', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ environment: 'sandbox' }));
      await expect(svc.getFrontendConfig('owner-123')).rejects.toThrow(/application_id/i);
    });
  });

  describe('getRecipientStatus', () => {
    it('reports connected with merchant_id from GET /recipients/:key', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({ merchant_id: 'MLEXHMZCYM5EH', connected_at: '2026-07-19T07:57:15Z', agreement_version_accepted: 'v1' }),
      );
      const status = await svc.getRecipientStatus('owner-123');
      const [url] = fetchFn.mock.calls[0] as [string];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123');
      expect(status).toEqual({
        connected: true,
        recipientKey: 'owner-123',
        merchantId: 'MLEXHMZCYM5EH',
        connectedAt: '2026-07-19T07:57:15Z',
        agreementVersionAccepted: 'v1',
      });
    });

    it('reports not connected when merchant_id is null (OAuth incomplete)', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ merchant_id: null, agreement_version_accepted: 'v1' }));
      const status = await svc.getRecipientStatus('owner-123');
      expect(status.connected).toBe(false);
      expect(status.merchantId).toBeNull();
    });

    it('reports not connected when the recipient is unknown (non-ok)', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ code: 'RECIPIENT_NOT_FOUND' }, false, 404));
      expect((await svc.getRecipientStatus('nope')).connected).toBe(false);
    });
  });

  describe('charge', () => {
    it('POSTs documented fields and parses the { payment } envelope', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({
          payment: {
            id: 'NclJ2yPEO90UerN9PFgB3Iv9B5HZY',
            status: 'COMPLETED',
            amount_money: { amount: 1000, currency: 'USD' },
            app_fee_money: { amount: 100, currency: 'USD' },
            card_details: { card: { card_brand: 'VISA', last_4: '9259' } },
            receipt_url: 'https://squareup.com/receipt/preview/NclJ',
            reference_id: 'purchase-1',
          },
        }),
      );
      const result = await svc.charge('owner-123', {
        sourceId: 'cnon:test',
        amountCents: 1000,
        idempotencyKey: 'purchase-1',
        note: 'TCHS vs Nelson',
        referenceId: 'purchase-1',
        buyerEmailAddress: 'fan@example.com',
      });

      const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123/charge');
      const sent = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(sent).toEqual({
        source_id: 'cnon:test',
        amount_cents: 1000,
        idempotency_key: 'purchase-1',
        note: 'TCHS vs Nelson',
        reference_id: 'purchase-1',
        buyer_email_address: 'fan@example.com',
      });
      expect(sent).not.toHaveProperty('currency');
      expect(result).toMatchObject({
        paymentId: 'NclJ2yPEO90UerN9PFgB3Iv9B5HZY',
        status: 'COMPLETED',
        amountCents: 1000,
        appFeeCents: 100,
        cardBrand: 'VISA',
        cardLast4: '9259',
        receiptUrl: 'https://squareup.com/receipt/preview/NclJ',
      });
    });

    it('sends app_fee_bps only when overriding', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ payment: { id: 'p2', status: 'COMPLETED' } }));
      await svc.charge('owner-123', { sourceId: 's', amountCents: 500, idempotencyKey: 'p2', appFeeBps: 500 });
      const sent = JSON.parse((fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;
      expect(sent.app_fee_bps).toBe(500);
    });

    it('surfaces the Square decline detail on failure', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse(
          { error: 'Payment failed', code: 'CHARGE_FAILED', squareErrors: [{ code: 'CARD_DECLINED', detail: 'The card was declined' }] },
          false,
          502,
        ),
      );
      await expect(
        svc.charge('owner-123', { sourceId: 's', amountCents: 500, idempotencyKey: 'p3' }),
      ).rejects.toThrow(/The card was declined \[CARD_DECLINED\]/);
    });
  });

  describe('refund', () => {
    it('POSTs the refund and parses the { refund } envelope', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({ refund: { id: 'ref_1', status: 'PENDING', amount_money: { amount: 400, currency: 'USD' } } }),
      );
      const result = await svc.refund('owner-123', {
        paymentId: 'pay_1',
        amountCents: 400,
        idempotencyKey: 'r1',
        reason: 'buffering',
      });

      const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123/refunds');
      expect(JSON.parse(init.body as string)).toEqual({
        payment_id: 'pay_1',
        amount_cents: 400,
        idempotency_key: 'r1',
        reason: 'buffering',
      });
      expect(result).toMatchObject({ refundId: 'ref_1', status: 'PENDING', amountCents: 400 });
    });

    it('surfaces the relay error on refund failure', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse(
          { error: 'refund failed', code: 'REFUND_FAILED', squareErrors: [{ code: 'REFUND_ALREADY_PENDING', detail: 'already pending' }] },
          false,
          400,
        ),
      );
      await expect(
        svc.refund('owner-123', { paymentId: 'pay_1', amountCents: 400, idempotencyKey: 'r2' }),
      ).rejects.toThrow(/REFUND_ALREADY_PENDING/);
    });
  });
});
