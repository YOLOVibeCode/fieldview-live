import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { agent, type SuperTest } from 'supertest';
import app from '@/server';

function assertLiveTestEnv(): void {
  if (process.env.LIVE_TEST_MODE !== '1') {
    throw new Error(
      'LIVE tests require LIVE_TEST_MODE=1 and a dedicated DATABASE_URL/REDIS_URL. Refusing to run.'
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('LIVE tests require DATABASE_URL to be set (use a dedicated test database).');
  }
  // Safety: prevent accidental production runs.
  // Check DB name (not the password/user) so we don't false-positive on strings like "change_in_production".
  const parsed = new URL(process.env.DATABASE_URL);
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();
  if (!dbName.includes('test') && !dbName.includes('dev')) {
    throw new Error(
      `Refusing to run LIVE tests unless DATABASE_URL points to a test/dev database (got db="${dbName}").`
    );
  }
}

/**
 * Twilio signature algorithm:
 * base64(HMAC-SHA1(authToken, url + concat(sorted(params) as key+value)))
 */
function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');
  return crypto.createHmac('sha1', authToken).update(data).digest('base64');
}

describe('LIVE: Twilio webhook (signature + unknown keyword path)', () => {
  it('returns friendly message for unknown keyword without sending outbound SMS', async () => {
    assertLiveTestEnv();

    // Use a local host header so we can deterministically compute Twilio signature
    const host = 'localhost';
    const url = `http://${host}/api/webhooks/twilio`;
    const authToken = process.env.TWILIO_AUTH_TOKEN || 'test-auth-token';

    const params = {
      From: '+15551234567',
      Body: 'NOT_A_REAL_CODE',
    };

    const signature = twilioSignature(authToken, url, params);

    const request: SuperTest<typeof app> = agent(app);
    const response = await request
      .post('/api/webhooks/twilio')
      .set('Host', host)
      .set('x-twilio-signature', signature)
      .type('form')
      .send(params)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/xml');
    expect(response.text).toContain('Game not found');
  });
});

