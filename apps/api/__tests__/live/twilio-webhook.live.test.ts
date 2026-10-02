import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { agent, type SuperTest } from 'supertest';
import app from '@/server';
import { SMS_INBOUND_WEBHOOK_URL } from '@fieldview/data-model';

function assertLiveTestEnv(): void {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error(
      'LIVE tests require LIVE_TEST_MODE=1 and a dedicated DATABASE_URL/REDIS_URL. Refusing to run.',
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('LIVE tests require DATABASE_URL to be set (use a dedicated test database).');
  }
  const parsed = new URL(process.env.DATABASE_URL);
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();
  if (!dbName.includes('test') && !dbName.includes('dev')) {
    throw new Error(
      `Refusing to run LIVE tests unless DATABASE_URL points to a test/dev database (got db="${dbName}").`,
    );
  }
}

function relaySignature(secret: string, url: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(url + body).digest('base64');
}

describe('LIVE: Twilio relay webhook (signature + unknown keyword path)', () => {
  it('returns friendly message for unknown keyword without sending outbound SMS', async () => {
    assertLiveTestEnv();

    const secret = process.env.RELAY_INBOUND_SECRET || 'test-relay-secret';
    const params = {
      From: '+15551234567',
      Body: 'NOT_A_REAL_CODE',
    };
    const body = new URLSearchParams(params).toString();
    const signature = relaySignature(secret, SMS_INBOUND_WEBHOOK_URL, body);

    const request: SuperTest<typeof app> = agent(app);
    const response = await request
      .post('/api/webhooks/twilio')
      .set('x-relay-signature', signature)
      .type('form')
      .send(params)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/xml');
    expect(response.text).toContain('Game not found');
  });
});
