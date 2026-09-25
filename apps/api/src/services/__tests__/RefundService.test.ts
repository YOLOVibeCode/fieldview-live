import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RefundService } from '../RefundService';

describe('RefundService.processMarketplaceRefund', () => {
  const purchaseReader = { getById: vi.fn() };
  const purchaseWriter = { update: vi.fn() };
  const playbackSessionReader = { listByEntitlementId: vi.fn() };
  const refundReader = { getById: vi.fn(), getByPurchaseId: vi.fn() };
  const refundWriter = { create: vi.fn(), update: vi.fn() };
  const entitlementReader = { getByPurchaseId: vi.fn() };
  const smsWriter = { sendPaymentLink: vi.fn() };
  const ownerReader = { findById: vi.fn() };
  const marketplace = { refund: vi.fn(), createCheckout: vi.fn() };

  let svc: RefundService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new RefundService(
      purchaseReader as never,
      purchaseWriter as never,
      playbackSessionReader as never,
      refundReader as never,
      refundWriter as never,
      entitlementReader as never,
      smsWriter as never,
      ownerReader as never,
      marketplace as never,
    );
  });

  it('calls marketplace refund API', async () => {
    refundReader.getById.mockResolvedValue({
      id: 'refund-1',
      amountCents: 500,
      reasonCode: 'TEST',
      processedAt: null,
      purchase: { paymentProviderPaymentId: 'pay-1', recipientOwnerAccountId: 'owner-1' },
    });
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', marketplaceSellerKey: 'owner-1' });
    await svc.processMarketplaceRefund('refund-1');
    expect(marketplace.refund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'pay-1', sellerKey: 'owner-1' }),
    );
  });
});
