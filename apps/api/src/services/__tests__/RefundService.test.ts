import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RefundService } from '../RefundService';

const purchase = {
  id: 'purchase-1',
  amountCents: 500,
  platformFeeCents: 50,
  currency: 'USD',
  status: 'paid',
  paymentProviderPaymentId: 'pay-1',
  recipientOwnerAccountId: 'owner-1',
};

function pendingRefund(over: Record<string, unknown> = {}) {
  return {
    id: 'refund-1',
    purchaseId: 'purchase-1',
    amountCents: 500,
    reasonCode: 'TEST',
    processedAt: null,
    purchase,
    ...over,
  };
}

describe('RefundService', () => {
  const purchaseReader = { getById: vi.fn() };
  const purchaseWriter = { update: vi.fn() };
  const playbackSessionReader = { listByEntitlementId: vi.fn() };
  const refundReader = { getById: vi.fn(), getByPurchaseId: vi.fn() };
  const refundWriter = { create: vi.fn(), update: vi.fn() };
  const entitlementReader = { getByPurchaseId: vi.fn() };
  const smsWriter = { sendPaymentLink: vi.fn(), sendNotification: vi.fn() };
  const ownerReader = { findById: vi.fn() };
  const marketplace = { refund: vi.fn(), createCheckout: vi.fn() };
  const ledgerService = { createRefundLedgerEntries: vi.fn() };
  const ledgerReader = { findByReference: vi.fn() };
  const entitlementWriter = { update: vi.fn() };

  let svc: RefundService;

  beforeEach(() => {
    vi.clearAllMocks();
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', marketplaceSellerKey: 'owner-1' });
    purchaseReader.getById.mockResolvedValue(purchase);
    refundReader.getByPurchaseId.mockResolvedValue([]);
    refundWriter.create.mockImplementation((data: { amountCents: number }) =>
      Promise.resolve(pendingRefund({ amountCents: data.amountCents })),
    );
    refundReader.getById.mockResolvedValue(pendingRefund());
    marketplace.refund.mockResolvedValue(undefined);
    ledgerReader.findByReference.mockResolvedValue([]);
    entitlementReader.getByPurchaseId.mockResolvedValue({ id: 'ent-1', status: 'active' });
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
      ledgerService as never,
      ledgerReader as never,
      entitlementWriter as never,
    );
  });

  describe('processMarketplaceRefund', () => {
    it('calls marketplace refund API', async () => {
      await svc.processMarketplaceRefund('refund-1');
      expect(marketplace.refund).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 'pay-1', sellerKey: 'owner-1' }),
      );
    });

    it('marks the purchase refunded only after the store accepts the refund', async () => {
      await svc.processMarketplaceRefund('refund-1');
      expect(purchaseWriter.update).toHaveBeenCalledWith(
        'purchase-1',
        expect.objectContaining({ status: 'refunded' }),
      );
      expect(marketplace.refund.mock.invocationCallOrder[0]).toBeLessThan(
        purchaseWriter.update.mock.invocationCallOrder[0],
      );
    });

    it('marks a partial refund as partially_refunded', async () => {
      refundReader.getById.mockResolvedValue(pendingRefund({ amountCents: 200 }));
      await svc.processMarketplaceRefund('refund-1');
      expect(purchaseWriter.update).toHaveBeenCalledWith(
        'purchase-1',
        expect.objectContaining({ status: 'partially_refunded' }),
      );
    });

    it('leaves the purchase and refund untouched when the store rejects the refund', async () => {
      marketplace.refund.mockRejectedValue(new Error('store down'));
      await expect(svc.processMarketplaceRefund('refund-1')).rejects.toThrow('store down');
      expect(purchaseWriter.update).not.toHaveBeenCalled();
      expect(refundWriter.update).not.toHaveBeenCalled();
      expect(ledgerService.createRefundLedgerEntries).not.toHaveBeenCalled();
    });

    it('writes the ledger reversal for the refund', async () => {
      refundReader.getById.mockResolvedValue(pendingRefund({ amountCents: 200 }));
      await svc.processMarketplaceRefund('refund-1');
      expect(ledgerService.createRefundLedgerEntries).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'purchase-1' }),
        200,
        'refund-1',
      );
    });

    it('does not write the ledger reversal twice', async () => {
      ledgerReader.findByReference.mockResolvedValue([{ id: 'ledger-1' }]);
      await svc.processMarketplaceRefund('refund-1');
      expect(ledgerReader.findByReference).toHaveBeenCalledWith('refund', 'refund-1');
      expect(ledgerService.createRefundLedgerEntries).not.toHaveBeenCalled();
    });

    it('still completes the refund when the ledger write fails', async () => {
      ledgerService.createRefundLedgerEntries.mockRejectedValue(new Error('db'));
      await expect(svc.processMarketplaceRefund('refund-1')).resolves.toBeUndefined();
      expect(refundWriter.update).toHaveBeenCalledWith(
        'refund-1',
        expect.objectContaining({ processedAt: expect.any(Date) as Date }),
      );
    });

    it('revokes the viewer\'s access on a full refund', async () => {
      await svc.processMarketplaceRefund('refund-1');
      expect(entitlementWriter.update).toHaveBeenCalledWith(
        'ent-1',
        expect.objectContaining({ status: 'revoked', revokedAt: expect.any(Date) as Date }),
      );
    });

    it('keeps the viewer\'s access on a partial refund', async () => {
      refundReader.getById.mockResolvedValue(pendingRefund({ amountCents: 200 }));
      await svc.processMarketplaceRefund('refund-1');
      expect(entitlementWriter.update).not.toHaveBeenCalled();
    });

    it('does nothing for a refund that was already processed', async () => {
      refundReader.getById.mockResolvedValue(pendingRefund({ processedAt: new Date() }));
      await svc.processMarketplaceRefund('refund-1');
      expect(marketplace.refund).not.toHaveBeenCalled();
    });
  });

  describe('issueManualRefund', () => {
    it('does not mark the purchase refunded when the store rejects the refund', async () => {
      marketplace.refund.mockRejectedValue(new Error('store down'));
      await expect(svc.issueManualRefund('purchase-1', 500, 'admin_manual', 'admin-1')).rejects.toThrow();
      expect(purchaseWriter.update).not.toHaveBeenCalled();
    });

    it('retries a pending refund with the same idempotency key instead of refusing', async () => {
      refundReader.getByPurchaseId.mockResolvedValue([pendingRefund()]);
      const refund = await svc.issueManualRefund('purchase-1', 500, 'admin_manual', 'admin-1');
      expect(refund.id).toBe('refund-1');
      expect(refundWriter.create).not.toHaveBeenCalled();
      expect(marketplace.refund).toHaveBeenCalledWith(expect.objectContaining({ refundId: 'refund-1' }));
    });

    it('refuses a different amount while another refund is pending', async () => {
      refundReader.getByPurchaseId.mockResolvedValue([pendingRefund()]);
      await expect(svc.issueManualRefund('purchase-1', 200, 'admin_manual', 'admin-1')).rejects.toThrow(
        /already pending/,
      );
      expect(marketplace.refund).not.toHaveBeenCalled();
    });

    it('refuses once the purchase has a processed refund', async () => {
      refundReader.getByPurchaseId.mockResolvedValue([pendingRefund({ processedAt: new Date() })]);
      await expect(svc.issueManualRefund('purchase-1', 500, 'admin_manual', 'admin-1')).rejects.toThrow(
        /already refunded/,
      );
    });
  });
});
