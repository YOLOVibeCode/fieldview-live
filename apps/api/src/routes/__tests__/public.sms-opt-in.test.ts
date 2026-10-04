import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordViewerConsent = vi.fn().mockResolvedValue(undefined);
vi.mock('../../lib/sms/consentFromRequest', async (orig) => {
  const actual = await orig<typeof import('../../lib/sms/consentFromRequest')>();
  return { ...actual, getSmsComplianceFromRequest: () => ({ recordViewerConsent }) };
});

import { errorHandler } from '../../middleware/errorHandler';
import { createPublicSmsOptInRouter, SMS_OPT_IN_PAGE_SOURCE } from '../public.sms-opt-in';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/public', createPublicSmsOptInRouter());
  a.use(errorHandler);
  return a;
}

describe('POST /api/public/sms/opt-in', () => {
  beforeEach(() => recordViewerConsent.mockClear());

  it('records consent in E.164 with the page source, IP, and user agent', async () => {
    const res = await request(app())
      .post('/api/public/sms/opt-in')
      .set('x-forwarded-for', '203.0.113.9, 10.0.0.1')
      .set('user-agent', 'test-agent')
      .send({ phone: '(817) 555-0123', consent: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(recordViewerConsent).toHaveBeenCalledWith({
      phoneE164: '+18175550123',
      source: SMS_OPT_IN_PAGE_SOURCE,
      ipAddress: '203.0.113.9',
      userAgent: 'test-agent',
    });
  });

  it('refuses without the checkbox: a phone number alone is not consent', async () => {
    for (const consent of [false, undefined, 'true', 1]) {
      const res = await request(app()).post('/api/public/sms/opt-in').send({ phone: '8175550123', consent });
      expect(res.status).toBe(400);
    }
    expect(recordViewerConsent).not.toHaveBeenCalled();
  });

  it('refuses an invalid or missing phone number', async () => {
    expect((await request(app()).post('/api/public/sms/opt-in').send({ phone: '123', consent: true })).status).toBe(400);
    expect((await request(app()).post('/api/public/sms/opt-in').send({ consent: true })).status).toBe(400);
    expect(recordViewerConsent).not.toHaveBeenCalled();
  });

  it('silently drops a submission that fills the hidden honeypot field', async () => {
    const res = await request(app())
      .post('/api/public/sms/opt-in')
      .send({ phone: '8175550123', consent: true, website: 'spam.example' });
    expect(res.status).toBe(200);
    expect(recordViewerConsent).not.toHaveBeenCalled();
  });
});
