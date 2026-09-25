/**
 * RefundService.processSquareRefund — relay Connect Hub only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RefundService } from '../RefundService';

function build() {
  const purchaseReader = { getById: vi.fn() };
  const purchaseWriter = { update: vi.fn() };
  const refundReader = { getById: vi.fn(), getByPurchaseId: vi.fn() };
  const refundWriter = { create: vi.fn(), update: vi.fn() };
  const ownerReader = { findById: vi.fn(), findByContactEmail: vi.fn() };
  const relay = { charge: vi.fn(), refund: vi.fn() };
  const svc = new RefundService(
    purchaseReader as never,
    purchaseWriter as never,
    {} as never,
    refundReader as never,
    refundWriter as never,
    {} as never,
    {} as never,
    ownerReader as never,
    relay as never,
  );
  return { svc, purchaseReader, purchaseWriter, refundReader, refundWriter, ownerReader, relay };
}

const refundRow = (over: Record<string, unknown> = {}) => ({
  id: 'refund-1',
  amountCents: 500,
  reasonCode: 'buffering',
  processedAt: null,
  purchase: { recipientOwnerAccountId: 'owner-1', paymentProviderPaymentId: 'pay_1', currency: 'USD' },
  ...over,
});

describe('RefundService.processSquareRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refunds via the relay when the owner has a recipient key', async () => {
    const { svc, refundReader, refundWriter, ownerReader, relay } = build();
    refundReader.getById.mockResolvedValue(refundRow());
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', relayRecipientKey: 'owner-1' });
    relay.refund.mockResolvedValue({ refundId: 'r1', status: 'PENDING', amountCents: 500, raw: {} });

    await svc.processSquareRefund('refund-1');

    expect(relay.refund).toHaveBeenCalledWith('owner-1', {
      paymentId: 'pay_1',
      amountCents: 500,
      idempotencyKey: 'refund-refund-1',
      reason: 'buffering',
    });
    expect(refundWriter.update).toHaveBeenCalledWith('refund-1', { processedAt: expect.any(Date) });
  });

  it('throws when the owner is not connected on the relay', async () => {
    const { svc, refundReader, ownerReader, relay } = build();
    refundReader.getById.mockResolvedValue(refundRow());
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', relayRecipientKey: null });

    await expect(svc.processSquareRefund('refund-1')).rejects.toThrow(/relay/);
    expect(relay.refund).not.toHaveBeenCalled();
  });
});

describe('RefundService.issueManualRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a refund, marks the purchase, and processes via the relay', async () => {
    const { svc, purchaseReader, purchaseWriter, refundReader, refundWriter, ownerReader, relay } = build();
    purchaseReader.getById.mockResolvedValue({ amountCents: 1000 });
    refundReader.getByPurchaseId.mockResolvedValue([]);
    refundWriter.create.mockResolvedValue({ id: 'refund-1', amountCents: 400 });
    refundReader.getById.mockResolvedValue({
      id: 'refund-1',
      amountCents: 400,
      reasonCode: 'goodwill',
      processedAt: null,
      purchase: { recipientOwnerAccountId: 'owner-1', paymentProviderPaymentId: 'pay_1', currency: 'USD' },
    });
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', relayRecipientKey: 'owner-1' });
    relay.refund.mockResolvedValue({ refundId: 'r1', status: 'PENDING', amountCents: 400, raw: {} });

    await svc.issueManualRefund('purchase-1', 400, 'goodwill', 'admin-1');

    expect(refundWriter.create).toHaveBeenCalled();
    expect(purchaseWriter.update).toHaveBeenCalled();
    expect(relay.refund).toHaveBeenCalled();
  });
});
