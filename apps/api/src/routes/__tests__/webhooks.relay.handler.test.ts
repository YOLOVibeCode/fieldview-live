import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({ prisma: { ownerAccount: { findFirst: vi.fn() } } }));
vi.mock('../../lib/idempotency', () => ({
  checkIdempotencyKey: vi.fn().mockResolvedValue({ exists: false }),
  storeIdempotencyKey: vi.fn().mockResolvedValue(undefined),
}));

import { RelayWebhookHandler } from '../webhooks.relay';
import type { IPurchaseReader, IPurchaseWriter } from '../../repositories/IPurchaseRepository';
import type { PurchaseFulfillmentService } from '../../services/PurchaseFulfillmentService';
import type { OwnerAccountRepository } from '../../repositories/implementations/OwnerAccountRepository';

describe('RelayWebhookHandler', () => {
  let purchaseReader: IPurchaseReader;
  let purchaseWriter: IPurchaseWriter;
  let fulfillment: PurchaseFulfillmentService;
  let ownerRepo: OwnerAccountRepository;
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
    fulfillment = {
      fulfillPaidPurchase: vi.fn().mockResolvedValue({ entitlementToken: 'tok' }),
    } as unknown as PurchaseFulfillmentService;
    ownerRepo = { update: vi.fn() } as unknown as OwnerAccountRepository;
    handler = new RelayWebhookHandler(purchaseReader, purchaseWriter, fulfillment, ownerRepo);
  });

  const ctx = { productKey: 'fieldview', recipientKey: 'owner-1' };

  it('fulfills purchase on checkout.session.completed', async () => {
    vi.mocked(purchaseReader.getById).mockResolvedValue({
      id: 'purchase-1',
      status: 'created',
    } as Awaited<ReturnType<IPurchaseReader['getById']>>);

    await handler.handle(
      {
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'purchase-1',
            payment_intent: 'pi_1',
          },
        },
      },
      ctx,
    );

    expect(fulfillment.fulfillPaidPurchase).toHaveBeenCalledWith({
      purchaseId: 'purchase-1',
      paymentProviderPaymentId: 'pi_1',
      appFeeCents: null,
    });
  });

  it('marks purchase refunded on charge.refunded', async () => {
    vi.mocked(purchaseReader.getByPaymentProviderId).mockResolvedValue({
      id: 'purchase-3',
    } as Awaited<ReturnType<IPurchaseReader['getById']>>);

    await handler.handle(
      {
        id: 'evt_2',
        type: 'charge.refunded',
        data: { object: { payment_intent: 'pi_3' } },
      },
      ctx,
    );

    expect(purchaseWriter.update).toHaveBeenCalledWith('purchase-3', {
      status: 'refunded',
      refundedAt: expect.any(Date),
    });
  });
});
