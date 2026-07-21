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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    const result = await apiClient.getPurchaseStatus('p1');
    expect(result.purchaseId).toBe('p1');
    expect(result.status).toBe('paid');
    expect(result.entitlementToken).toBe('t1');
  });

  it('processPurchasePayment throws ApiError on non-OK response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'BAD_REQUEST', message: 'Invalid request' } }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    await expect(apiClient.processPurchasePayment('p1', { sourceId: 'x' })).rejects.toBeInstanceOf(ApiError);
  });

  it('adminSearch includes bearer token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ viewers: [], games: [], purchases: [] }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    await apiClient.adminSearch('admin_session_abc', 'test');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const init = fetchMock.mock.calls[0]?.[1];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(init?.headers?.Authorization).toBe('Bearer admin_session_abc');
  });

  it('getSavedPaymentMethods calls saved-payments endpoint with purchaseId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ paymentMethods: [] }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    await apiClient.getSavedPaymentMethods('purchase-123');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/api/public/saved-payments?purchaseId=purchase-123');
  });

  it('ownerPaymentsStatus GETs status with bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recipientKey: 'owner-1',
        merchantId: 'ML1',
        agreementAccepted: true,
        agreementVersion: 'v1',
        connected: true,
        connectedAt: '2026-07-20T00:00:00Z',
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    const result = await apiClient.ownerPaymentsStatus('owner_token_abc');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    const init = fetchMock.mock.calls[0]?.[1];
    expect(url).toContain('/api/owners/me/payments/status');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(init?.headers?.Authorization).toBe('Bearer owner_token_abc');
    expect(result.connected).toBe(true);
    expect(result.merchantId).toBe('ML1');
  });

  it('ownerPaymentsConnect POSTs and returns the authorize URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authorizeUrl: 'https://relay/authorize', recipientKey: 'owner-1' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    const result = await apiClient.ownerPaymentsConnect('owner_token_abc');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    const init = fetchMock.mock.calls[0]?.[1];
    expect(url).toContain('/api/owners/me/payments/connect');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(init?.method).toBe('POST');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(init?.headers?.Authorization).toBe('Bearer owner_token_abc');
    expect(result.authorizeUrl).toBe('https://relay/authorize');
  });

  it('ownerAcceptAgreement POSTs the version', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, version: 'v1' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    await apiClient.ownerAcceptAgreement('owner_token_abc', 'v1');

    const init = fetchMock.mock.calls[0]?.[1];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(JSON.parse(init?.body as string)).toEqual({ version: 'v1' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(init?.headers?.Authorization).toBe('Bearer owner_token_abc');
  });

  it('ownerSetPaymentLocation POSTs the locationId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ locationId: 'LOC1' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    global.fetch = fetchMock as any;

    await apiClient.ownerSetPaymentLocation('owner_token_abc', 'LOC1');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    const init = fetchMock.mock.calls[0]?.[1];
    expect(url).toContain('/api/owners/me/payments/location');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(JSON.parse(init?.body as string)).toEqual({ locationId: 'LOC1' });
  });
});


