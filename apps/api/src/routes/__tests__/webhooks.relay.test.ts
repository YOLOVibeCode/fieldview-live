import crypto from 'crypto';

import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createRelayWebhookRouter, setRelayWebhookHandler } from '../webhooks.relay';

const CALLBACK = 'http://localhost:4301/api/webhooks/relay';

function makeApp() {
  const a = express();
  // Replicate the app-wide raw-body capture used for HMAC verification.
  a.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  a.use('/api/webhooks', createRelayWebhookRouter());
  return a;
}

const sign = (secret: string, body: string) =>
  crypto.createHmac('sha256', secret).update(CALLBACK + body).digest('base64');

describe('POST /api/webhooks/relay', () => {
  beforeEach(() => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'whsec');
    vi.stubEnv('FIELDVIEW_WEBHOOK_CALLBACK_URL', CALLBACK);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a validly-signed event and dispatches it with context', async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    setRelayWebhookHandler({ handle });
    const payload = JSON.stringify({
      type: 'refund.updated',
      data: { object: { refund: { payment_id: 'pay_1', status: 'COMPLETED' } } },
    });

    const res = await request(makeApp())
      .post('/api/webhooks/relay')
      .set('Content-Type', 'application/json')
      .set('x-connect-signature', sign('whsec', payload))
      .set('x-connect-product', 'fieldview')
      .set('x-connect-recipient-key', 'owner-1')
      .send(payload);

    expect(res.status).toBe(200);
    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refund.updated' }),
      expect.objectContaining({ productKey: 'fieldview', recipientKey: 'owner-1' }),
    );
  });

  it('rejects an invalid signature with 401 and does not dispatch', async () => {
    const handle = vi.fn();
    setRelayWebhookHandler({ handle });
    const payload = JSON.stringify({ type: 'refund.updated' });

    const res = await request(makeApp())
      .post('/api/webhooks/relay')
      .set('Content-Type', 'application/json')
      .set('x-connect-signature', sign('wrong-secret', payload))
      .send(payload);

    expect(res.status).toBe(401);
    expect(handle).not.toHaveBeenCalled();
  });
});
