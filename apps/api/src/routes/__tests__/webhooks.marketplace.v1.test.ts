import crypto from 'crypto';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

const getById = vi.fn();
const update = vi.fn();

vi.mock('../../lib/prisma', () => ({
  prisma: { viewerIdentity: { findUnique: vi.fn().mockResolvedValue({ email: 'viewer@example.com' }) } },
}));

vi.mock('../../repositories/implementations/PurchaseRepository', () => ({
  PurchaseRepository: vi.fn().mockImplementation(() => ({ getById, update, getByPaymentProviderId: vi.fn() })),
}));

import type { PurchaseFulfillmentService } from '../../services/PurchaseFulfillmentService';
import { createMarketplaceWebhookRouter, setPurchaseFulfillmentService } from '../webhooks.marketplace';

const CALLBACK = 'http://127.0.0.1/api/webhooks/marketplace';
const fulfillPaidPurchase = vi.fn().mockResolvedValue({});

function app() {
  const a = express();
  a.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  a.use('/api/webhooks', createMarketplaceWebhookRouter());
  return a;
}

function v1(type: string, over: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: 'rel_evt_1',
    type,
    version: 1,
    store: 'fieldview@owner_1',
    product: 'fieldview',
    mode: 'test',
    occurredAt: '2026-09-27T16:00:00Z',
    buyer: { userId: 'purchase_1', email: 'viewer@example.com' },
    item: null,
    money: { amountCents: 500, currency: 'USD', refundedCents: 0, feeCents: 50 },
    refs: { orderId: 'ord_1', paymentId: 'pay_1', subscriptionId: null, refundId: null, disputeId: null },
    subscription: null,
    seller: { ref: 'sel_1', key: 'owner_1', status: 'active', chargesEnabled: true, payoutsEnabled: true, requirementsDue: [] },
    action: null,
    entitlements: {},
    ...over,
  });
}

function send(body: string, secret = 'connect') {
  return request(app())
    .post('/api/webhooks/marketplace')
    .set('Content-Type', 'application/json')
    .set('x-noctusoft-signature', crypto.createHmac('sha256', secret).update(body).digest('hex'))
    .set('x-relay-signature', crypto.createHmac('sha256', secret).update(CALLBACK + body).digest('base64'))
    .send(body);
}

describe('POST /api/webhooks/marketplace (event v1)', () => {
  beforeEach(() => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'connect');
    vi.stubEnv('FIELDVIEW_WEBHOOK_CALLBACK_URL', CALLBACK);
    getById.mockReset();
    update.mockReset();
    fulfillPaidPurchase.mockClear();
    setPurchaseFulfillmentService({ fulfillPaidPurchase } as unknown as PurchaseFulfillmentService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fulfills the purchase named by buyer.userId with the payment ref and the platform fee', async () => {
    getById.mockResolvedValue({ id: 'purchase_1', status: 'created', amountCents: 500, viewerId: 'v1' });
    const res = await send(v1('marketplace.purchase.paid'));
    expect(res.status).toBe(200);
    expect(getById).toHaveBeenCalledWith('purchase_1');
    const [input] = fulfillPaidPurchase.mock.calls[0] as [
      { paymentId: string; split: { platformFeeCents: number }; viewerEmail?: string },
    ];
    expect(input.paymentId).toBe('pay_1');
    expect(input.split.platformFeeCents).toBe(50);
    expect(input.viewerEmail).toBe('viewer@example.com');
  });

  it('does not fulfill a purchase that is no longer pending', async () => {
    getById.mockResolvedValue({ id: 'purchase_1', status: 'paid', amountCents: 500, viewerId: 'v1' });
    const res = await send(v1('marketplace.purchase.paid'));
    expect(res.status).toBe(200);
    expect(fulfillPaidPurchase).not.toHaveBeenCalled();
  });

  it('marks the purchase failed on marketplace.purchase.failed', async () => {
    getById.mockResolvedValue({ id: 'purchase_1', status: 'created', amountCents: 500, viewerId: 'v1' });
    const res = await send(v1('marketplace.purchase.failed'));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith('purchase_1', expect.objectContaining({ status: 'failed' }));
  });

  it('rejects an event signed with another key', async () => {
    const res = await send(v1('marketplace.purchase.paid'), 'wrong');
    expect(res.status).toBe(401);
    expect(fulfillPaidPurchase).not.toHaveBeenCalled();
  });
});
