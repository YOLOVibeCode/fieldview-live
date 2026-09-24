/**
 * RelayConnectHubService tests (mocked fetch, no network).
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

  describe('onboard', () => {
    it('POSTs refresh_url and return_url to /onboard', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({ url: 'https://connect.stripe.com/setup', stripe_account_id: 'acct_1' }),
      );
      const result = await svc.onboard('owner-123', {
        refreshUrl: 'https://app/refresh',
        returnUrl: 'https://app/return',
        email: 'coach@example.com',
      });

      const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://relay.test/connect/fieldview/recipients/owner-123/onboard');
      expect(JSON.parse(init.body as string)).toEqual({
        refresh_url: 'https://app/refresh',
        return_url: 'https://app/return',
        email: 'coach@example.com',
      });
      expect(result).toEqual({ url: 'https://connect.stripe.com/setup', stripeAccountId: 'acct_1' });
    });
  });

  describe('acceptAgreement', () => {
    it('POSTs agreement_version', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ agreement_version_accepted: 'v1', agreement_accepted_at: 1 }));
      const result = await svc.acceptAgreement('owner-123', 'v1');
      expect(result.version).toBe('v1');
    });
  });

  describe('getRecipientStatus', () => {
    it('reports connected when charges_enabled is true', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({
          charges_enabled: true,
          stripe_account_id: 'acct_1',
          connected_at: '2026-07-19T07:57:15Z',
        }),
      );
      const status = await svc.getRecipientStatus('owner-123');
      expect(status).toEqual({
        connected: true,
        recipientKey: 'owner-123',
        stripeAccountId: 'acct_1',
        connectedAt: '2026-07-19T07:57:15Z',
        agreementVersionAccepted: null,
      });
    });

    it('reports not connected when charges_enabled is false', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ charges_enabled: false, stripe_account_id: 'acct_1' }));
      expect((await svc.getRecipientStatus('owner-123')).connected).toBe(false);
    });
  });

  describe('charge', () => {
    it('POSTs Stripe Checkout fields and parses url + sessionId', async () => {
      fetchFn.mockResolvedValue(
        jsonResponse({
          url: 'https://checkout.stripe.com/c/pay/cs_1',
          sessionId: 'cs_1',
          payment: { id: 'pi_1', application_fee_amount: 100 },
        }),
      );
      const result = await svc.charge('owner-123', {
        amountCents: 1000,
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
        idempotencyKey: 'purchase-1',
        note: 'FieldView purchase purchase-1',
      });

      const sent = JSON.parse((fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<
        string,
        unknown
      >;
      expect(sent).toEqual({
        amount_cents: 1000,
        success_url: 'https://app/success',
        cancel_url: 'https://app/cancel',
        idempotency_key: 'purchase-1',
        note: 'FieldView purchase purchase-1',
      });
      expect(result).toMatchObject({
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_1',
        sessionId: 'cs_1',
        paymentIntentId: 'pi_1',
        appFeeCents: 100,
      });
    });
  });

  describe('refund', () => {
    it('POSTs payment_id as Stripe payment intent id', async () => {
      fetchFn.mockResolvedValue(jsonResponse({ refund: { id: 're_1', status: 'succeeded', amount: 400 } }));
      const result = await svc.refund('owner-123', {
        paymentId: 'pi_1',
        amountCents: 400,
        idempotencyKey: 'r1',
      });
      expect(JSON.parse((fetchFn.mock.calls[0] as [string, RequestInit])[1].body as string)).toMatchObject({
        payment_id: 'pi_1',
      });
      expect(result.refundId).toBe('re_1');
    });
  });
});
