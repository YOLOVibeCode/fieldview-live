import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '@/lib/api-client';

describe('api-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getPurchaseStatus returns parsed JSON on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ purchaseId: 'p1', status: 'paid', entitlementToken: 't1' }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await apiClient.getPurchaseStatus('p1');
    expect(result.purchaseId).toBe('p1');
    expect(result.status).toBe('paid');
  });

  it('createPurchaseCheckoutSession POSTs checkout-session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: 'https://store.test/pay', status: 'created' }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await apiClient.createPurchaseCheckoutSession('p1');
    expect(result.checkoutUrl).toContain('store.test');
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/checkout-session');
  });

  it('createPurchaseCheckoutSession throws ApiError on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'BAD_REQUEST', message: 'Invalid request' } }),
    });
    global.fetch = fetchMock as typeof fetch;

    await expect(apiClient.createPurchaseCheckoutSession('p1')).rejects.toBeInstanceOf(ApiError);
  });

  it('ownerPaymentsConnect POSTs and returns onboarding URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ onboardingUrl: 'https://store.test/onboard', sellerKey: 'owner-1' }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await apiClient.ownerPaymentsConnect('owner_token_abc');
    expect(result.onboardingUrl).toBe('https://store.test/onboard');
    expect(result.sellerKey).toBe('owner-1');
  });

  it('ownerPaymentsStatus GETs status with bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sellerKey: 'owner-1',
        merchantId: 'ML1',
        connected: true,
        connectedAt: '2026-07-20T00:00:00Z',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await apiClient.ownerPaymentsStatus('owner_token_abc');
    expect(result.connected).toBe(true);
    expect(result.sellerKey).toBe('owner-1');
  });
});
