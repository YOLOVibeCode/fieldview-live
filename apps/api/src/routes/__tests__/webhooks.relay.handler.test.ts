import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

import { RelayWebhookHandler } from '../webhooks.relay';
import type { IPurchaseReader, IPurchaseWriter } from '../../repositories/IPurchaseRepository';

describe('RelayWebhookHandler', () => {
  let purchaseReader: IPurchaseReader;
  let purchaseWriter: IPurchaseWriter;
  let handler: RelayWebhookHandler;

  beforeEach(() => {
    purchaseReader = {
      getById: vi.fn(),
      getByPaymentProviderId: vi.fn(),
      listByGameId: vi.fn(),
      listByViewerId: vi.fn(),
    };
    purchaseWriter = {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    };
    handler = new RelayWebhookHandler(purchaseReader, purchaseWriter);
  });

  it('marks purchase paid on payment.updated COMPLETED', async () => {
    vi.mocked(purchaseReader.getByPaymentProviderId).mockResolvedValue({
      id: 'purchase-1',
    } as Awaited<ReturnType<IPurchaseReader['getById']>>);

    await handler.handle({
      type: 'payment.updated',
      data: { object: { payment: { id: 'pay_1', status: 'COMPLETED' } } },
    });

    expect(purchaseWriter.update).toHaveBeenCalledWith('purchase-1', {
      status: 'paid',
      paidAt: expect.any(Date),
    });
  });

  it('marks purchase failed on payment.updated FAILED', async () => {
    vi.mocked(purchaseReader.getByPaymentProviderId).mockResolvedValue({
      id: 'purchase-2',
    } as Awaited<ReturnType<IPurchaseReader['getById']>>);

    await handler.handle({
      type: 'payment.updated',
      data: { object: { payment: { id: 'pay_2', status: 'FAILED' } } },
    });

    expect(purchaseWriter.update).toHaveBeenCalledWith('purchase-2', {
      status: 'failed',
      failedAt: expect.any(Date),
    });
  });

  it('no-ops payment.updated when payment id is missing', async () => {
    await handler.handle({
      type: 'payment.updated',
      data: { object: { payment: { status: 'COMPLETED' } } },
    });

    expect(purchaseReader.getByPaymentProviderId).not.toHaveBeenCalled();
    expect(purchaseWriter.update).not.toHaveBeenCalled();
  });

  it('marks purchase refunded on refund.updated COMPLETED', async () => {
    vi.mocked(purchaseReader.getByPaymentProviderId).mockResolvedValue({
      id: 'purchase-3',
    } as Awaited<ReturnType<IPurchaseReader['getById']>>);

    await handler.handle({
      type: 'refund.updated',
      data: { object: { refund: { payment_id: 'pay_3', status: 'COMPLETED' } } },
    });

    expect(purchaseWriter.update).toHaveBeenCalledWith('purchase-3', {
      status: 'refunded',
      refundedAt: expect.any(Date),
    });
  });
});
