import express from 'express';
import crypto from 'crypto';
import request from 'supertest';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { createMarketplaceWebhookRouter } from '../webhooks.marketplace';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/webhooks/marketplace', () => {
  it('rejects invalid signatures', async () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'c');
    vi.stubEnv('NOCTUSOFT_WEBHOOK_SECRET', 'n');
    const app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as unknown as { rawBody?: Buffer }).rawBody = buf;
        },
      }),
    );
    app.use('/api/webhooks', createMarketplaceWebhookRouter());
    const res = await request(app)
      .post('/api/webhooks/marketplace')
      .set('x-connect-signature', 'bad')
      .set('x-noctusoft-signature', 'bad')
      .send({ type: 'marketplace.checkout.completed' });
    expect(res.status).toBe(401);
  });

  it('accepts valid dual signatures', async () => {
    vi.stubEnv('FIELDVIEW_WEBHOOK_SECRET', 'c');
    vi.stubEnv('NOCTUSOFT_WEBHOOK_SECRET', 'n');
    vi.stubEnv('FIELDVIEW_WEBHOOK_CALLBACK_URL', 'http://127.0.0.1/api/webhooks/marketplace');
    const body = JSON.stringify({ type: 'marketplace.checkout.completed', data: { reference_id: 'p1' } });
    const connect = crypto.createHmac('sha256', 'c').update('http://127.0.0.1/api/webhooks/marketplace' + body).digest('base64');
    const noctu = crypto.createHmac('sha256', 'n').update(body).digest('base64');
    const app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as unknown as { rawBody?: Buffer }).rawBody = buf;
        },
      }),
    );
    app.use('/api/webhooks', createMarketplaceWebhookRouter());
    const res = await request(app)
      .post('/api/webhooks/marketplace')
      .set('Content-Type', 'application/json')
      .set('x-connect-signature', connect)
      .set('x-noctusoft-signature', noctu)
      .send(body);
    expect(res.status).toBe(200);
  });
});
