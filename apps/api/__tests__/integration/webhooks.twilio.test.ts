import crypto from 'crypto';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SMS_INBOUND_WEBHOOK_URL, SMS_STATUS_WEBHOOK_URL } from '@fieldview/data-model';

import { SmsService } from '@/services/SmsService';
import * as twilioWebhookRoute from '@/routes/webhooks.twilio';

function signBody(secret: string, url: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(url + body).digest('base64');
}

function encodeForm(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sMSMessage: { create: vi.fn(), updateMany: vi.fn() },
    smsConsent: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn() },
    viewerIdentity: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    directStream: { findUnique: vi.fn() },
    subscription: { findFirst: vi.fn(), create: vi.fn() },
    game: { findFirst: vi.fn() },
  },
}));

describe('Twilio relay webhooks', () => {
  const secret = 'relay-test-secret';
  let mockSmsService: {
    findByKeyword: ReturnType<typeof vi.fn>;
    sendPaymentLink: ReturnType<typeof vi.fn>;
    logSmsMessage: ReturnType<typeof vi.fn>;
    handleStop: ReturnType<typeof vi.fn>;
    handleStart: ReturnType<typeof vi.fn>;
    handleHelp: ReturnType<typeof vi.fn>;
    handleYes: ReturnType<typeof vi.fn>;
    recordKeywordConsent: ReturnType<typeof vi.fn>;
    getHelpTwimlBody: ReturnType<typeof vi.fn>;
  };

  let app: express.Express;

  beforeEach(() => {
    vi.stubEnv('RELAY_INBOUND_SECRET', secret);
    mockSmsService = {
      findByKeyword: vi.fn(),
      sendPaymentLink: vi.fn(),
      logSmsMessage: vi.fn(),
      handleStop: vi.fn(),
      handleStart: vi.fn(),
      handleHelp: vi.fn(),
      handleYes: vi.fn(),
      recordKeywordConsent: vi.fn(),
      getHelpTwimlBody: vi.fn().mockReturnValue('FieldView.Live: help text'),
    };
    twilioWebhookRoute.setSmsService(mockSmsService as unknown as SmsService);
    app = express();
    app.use('/api/webhooks', twilioWebhookRoute.createTwilioWebhookRouter());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('handles STOP with empty TwiML', async () => {
    const body = encodeForm({ From: '+1234567890', Body: 'STOP' });
    const sig = signBody(secret, SMS_INBOUND_WEBHOOK_URL, body);
    const res = await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.text).toBe('<Response></Response>');
    expect(mockSmsService.handleStop).toHaveBeenCalledWith('+1234567890');
  });

  it('handles OptOutType STOP', async () => {
    const body = encodeForm({ From: '+1234567890', Body: 'x', OptOutType: 'STOP' });
    const sig = signBody(secret, SMS_INBOUND_WEBHOOK_URL, body);
    await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(body);
    expect(mockSmsService.handleStop).toHaveBeenCalled();
  });

  it('handles START', async () => {
    const body = encodeForm({ From: '+1234567890', Body: 'START' });
    const sig = signBody(secret, SMS_INBOUND_WEBHOOK_URL, body);
    await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(body);
    expect(mockSmsService.handleStart).toHaveBeenCalledWith('+1234567890');
  });

  it('handles HELP with TwiML message', async () => {
    const body = encodeForm({ From: '+1234567890', Body: 'HELP' });
    const sig = signBody(secret, SMS_INBOUND_WEBHOOK_URL, body);
    const res = await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(body);
    expect(res.text).toContain('<Message>');
    expect(mockSmsService.handleHelp).toHaveBeenCalled();
  });

  it('rejects invalid signature', async () => {
    const body = encodeForm({ From: '+1234567890', Body: 'STOP' });
    const res = await request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', 'bad')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('updates status callback on valid signature', async () => {
    const body = encodeForm({
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      From: '+1234567890',
    });
    const sig = signBody(secret, SMS_STATUS_WEBHOOK_URL, body);
    const res = await request(app)
      .post('/api/webhooks/twilio/status')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
  });
});
