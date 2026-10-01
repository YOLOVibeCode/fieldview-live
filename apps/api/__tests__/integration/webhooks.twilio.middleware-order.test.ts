import crypto from 'crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SMS_INBOUND_WEBHOOK_URL } from '@fieldview/data-model';

import app from '@/server';
import * as twilioWebhookRoute from '@/routes/webhooks.twilio';
import { SmsService } from '@/services/SmsService';

function signBody(secret: string, url: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(url + body).digest('base64');
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sMSMessage: { create: vi.fn(), updateMany: vi.fn() },
    smsConsent: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn() },
    viewerIdentity: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    game: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

describe('Twilio webhook middleware order (full app)', () => {
  const secret = 'relay-test-secret';

  beforeEach(() => {
    vi.stubEnv('RELAY_INBOUND_SECRET', secret);
    twilioWebhookRoute.setSmsService({
      handleStop: vi.fn(),
      handleStart: vi.fn(),
      handleHelp: vi.fn(),
      handleYes: vi.fn(),
      findByKeyword: vi.fn(),
      sendPaymentLink: vi.fn(),
      logSmsMessage: vi.fn(),
      recordKeywordConsent: vi.fn(),
      getHelpTwimlBody: vi.fn(),
    } as unknown as SmsService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects re-encoded inbound body before route handler runs', async () => {
    const signedBody = 'From=%2B15551234567&Body=STOP';
    const sig = signBody(secret, SMS_INBOUND_WEBHOOK_URL, signedBody);
    const reencodedBody = 'From=+15551234567&Body=STOP';

    const res = await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(reencodedBody);

    expect(res.status).toBe(401);
  });
});
