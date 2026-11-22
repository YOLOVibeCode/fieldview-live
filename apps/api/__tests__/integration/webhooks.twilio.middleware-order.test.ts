import crypto from 'crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SMS_INBOUND_WEBHOOK_URL, SMS_STATUS_WEBHOOK_URL } from '@fieldview/data-model';

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

  it('refuses a post nobody signed before it counts against the limit of the sender', async () => {
    const from = '+12145550190';
    const unsignedBody = new URLSearchParams({ From: from, Body: 'GAME1' }).toString();

    // The limit is 10 texts a minute for one sender.
    for (let i = 0; i < 12; i++) {
      const unsigned = await request(app)
        .post('/api/webhooks/twilio')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-relay-signature', 'not-a-signature')
        .send(unsignedBody);
      expect(unsigned.status).toBe(401);
    }

    const signedBody = new URLSearchParams({
      From: from,
      Body: 'GAME1',
      MessageSid: 'SM1',
    }).toString();
    const res = await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', signBody(secret, SMS_INBOUND_WEBHOOK_URL, signedBody))
      .send(signedBody);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Game not found');
  });

  it('still limits signed texts from one sender', async () => {
    const from = '+12145550191';
    const statuses: number[] = [];

    for (let i = 0; i < 11; i++) {
      const body = new URLSearchParams({
        From: from,
        Body: 'GAME1',
        MessageSid: `SM-limit-${i}`,
      }).toString();
      const res = await request(app)
        .post('/api/webhooks/twilio')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('x-relay-signature', signBody(secret, SMS_INBOUND_WEBHOOK_URL, body))
        .send(body);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });

  it('refuses an unsigned status post before it counts against the limit', async () => {
    const from = '+12145550192';
    const unsignedBody = new URLSearchParams({
      From: from,
      MessageSid: 'SM2',
      MessageStatus: 'sent',
    }).toString();

    for (let i = 0; i < 12; i++) {
      const unsigned = await request(app)
        .post('/api/webhooks/twilio/status')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(unsignedBody);
      expect(unsigned.status).toBe(401);
    }

    const res = await request(app)
      .post('/api/webhooks/twilio/status')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', signBody(secret, SMS_STATUS_WEBHOOK_URL, unsignedBody))
      .send(unsignedBody);

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });
});
