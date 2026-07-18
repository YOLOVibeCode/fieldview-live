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
});


