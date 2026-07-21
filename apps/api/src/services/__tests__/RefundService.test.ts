/**
 * RefundService.processSquareRefund — relay vs legacy branch.
 * ISP deps mocked via vi.fn(); lib/square mocked so the legacy path is inert.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/square', () => ({
  squareClient: { refundsApi: { refundPayment: vi.fn() } },
}));

import { RefundService } from '../RefundService';
import { squareClient } from '../../lib/square';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
const refundPaymentMock = (squareClient as any).refundsApi.refundPayment as ReturnType<typeof vi.fn>;

describe('RefundService.processSquareRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refunds via the relay when the flag is on and the owner is migrated', async () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
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
    expect(refundPaymentMock).not.toHaveBeenCalled();
  });

  it('falls back to the central Square client when the owner is not migrated', async () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    const { svc, refundReader, ownerReader, relay } = build();
    refundReader.getById.mockResolvedValue(refundRow());
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', relayRecipientKey: null });

    await svc.processSquareRefund('refund-1');

    expect(relay.refund).not.toHaveBeenCalled();
    expect(refundPaymentMock).toHaveBeenCalled();
  });

  it('does not touch the relay when the flag is off', async () => {
    const { svc, refundReader, ownerReader, relay } = build();
    refundReader.getById.mockResolvedValue(refundRow());

    await svc.processSquareRefund('refund-1');

    expect(relay.refund).not.toHaveBeenCalled();
    expect(ownerReader.findById).not.toHaveBeenCalled();
  });
});

describe('RefundService.issueManualRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a refund, marks the purchase, and processes via the relay', async () => {
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    const { svc, purchaseReader, purchaseWriter, refundReader, refundWriter, ownerReader, relay } = build();
    purchaseReader.getById.mockResolvedValue({ amountCents: 1000 });
    refundReader.getByPurchaseId.mockResolvedValue([]);
    refundWriter.create.mockResolvedValue({ id: 'refund-1', amountCents: 400 });
    // processSquareRefund reloads the refund with its purchase relation
    refundReader.getById.mockResolvedValue({
      id: 'refund-1',
      amountCents: 400,
      reasonCode: 'goodwill',
      processedAt: null,
      purchase: { recipientOwnerAccountId: 'owner-1', paymentProviderPaymentId: 'pay_1', currency: 'USD' },
    });
    ownerReader.findById.mockResolvedValue({ id: 'owner-1', relayRecipientKey: 'owner-1' });
    relay.refund.mockResolvedValue({ refundId: 'r1', status: 'PENDING', amountCents: 400, raw: {} });

    const result = await svc.issueManualRefund('p1', 400, 'goodwill', 'admin-1');

    expect(refundWriter.create).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseId: 'p1', amountCents: 400, reasonCode: 'goodwill', issuedBy: 'admin-1', ruleVersion: 'manual' }),
    );
    expect(purchaseWriter.update).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'partially_refunded' }));
    expect(relay.refund).toHaveBeenCalled();
    expect(result.id).toBe('refund-1');
  });

  it('rejects an amount over the purchase total', async () => {
    const { svc, purchaseReader, refundReader } = build();
    purchaseReader.getById.mockResolvedValue({ amountCents: 500 });
    refundReader.getByPurchaseId.mockResolvedValue([]);
    await expect(svc.issueManualRefund('p1', 999, 'x', 'admin-1')).rejects.toThrow(/Invalid refund amount/);
  });
});
