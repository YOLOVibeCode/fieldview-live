/**
 * The inbound text webhook with coach text commands in front of the viewer path.
 *
 * The coach engine here is the real one, on in-memory stores. Every test texts
 * from its own number, because the webhook limits texts per sender.
 */
import crypto from 'crypto';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SMS_INBOUND_WEBHOOK_URL, buildInboundHelpTwimlBody } from '@fieldview/data-model';

import { AccountChooser } from '@/modules/coach-text/AccountChooser';
import { CoachTextEngine } from '@/modules/coach-text/CoachTextEngine';
import { PhoneLinkService } from '@/modules/coach-text/PhoneLinkService';
import {
  FakeCommandLog,
  FakeConsent,
  FakeConversationStore,
  FakeLinkStore,
  FakeNotifier,
  FakeSettingsStore,
  makeOwner,
} from '@/modules/coach-text/__tests__/fakes';
import type { ICoachTextEngine } from '@/modules/coach-text/interfaces';
import * as twilioWebhookRoute from '@/routes/webhooks.twilio';
import { SmsService } from '@/services/SmsService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sMSMessage: { create: vi.fn(), updateMany: vi.fn() },
    smsConsent: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn() },
    viewerIdentity: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'viewer-1' }),
      update: vi.fn().mockResolvedValue({ id: 'viewer-1' }),
    },
    game: { findFirst: vi.fn() },
  },
}));

const SECRET = 'relay-test-secret';
const MINUTE = 60_000;

const EMPTY = '<Response></Response>';
const GAME_NOT_FOUND =
  '<Response><Message>FieldView.Live: Game not found. Please check your keyword and try again.</Message></Response>';
const GAME_NOT_AVAILABLE =
  '<Response><Message>FieldView.Live: This game is not currently available.</Message></Response>';
const LINKED =
  '<Response><Message>FieldView.Live: This phone now runs text commands for Diablos FC. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to pause, HELP for help.</Message></Response>';
const NO_MATCH =
  '<Response><Message>FieldView.Live: That code did not match or has expired. Open Text commands in your FieldView account for a new code.</Message></Response>';

function signBody(secret: string, url: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(url + body)
    .digest('base64');
}

function encodeForm(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

let phoneCount = 0;
/** A sender no other test in this file has used. */
function freshPhone(): string {
  const phone = `+1214555${String(100 + phoneCount).padStart(4, '0')}`;
  phoneCount += 1;
  return phone;
}

let sidCount = 0;
function freshSid(): string {
  sidCount += 1;
  return `SM${String(sidCount).padStart(32, '0')}`;
}

const VERIFIED = { 'x-relay-twilio-verified': '1' };

describe('Twilio inbound webhook with coach text commands', () => {
  let now: Date;
  let links: FakeLinkStore;
  let consent: FakeConsent;
  let commands: FakeCommandLog;
  let service: PhoneLinkService;
  let app: express.Express;
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

  const advance = (ms: number): void => {
    now = new Date(now.getTime() + ms);
  };

  /** Posts one inbound text the way the relay forwards it, signed. */
  async function text(
    fields: Record<string, string>,
    headers: Record<string, string> = VERIFIED
  ): Promise<request.Response> {
    const body = encodeForm({ MessageSid: freshSid(), ...fields });
    let req = request(app)
      .post('/api/webhooks/twilio')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-relay-signature', signBody(SECRET, SMS_INBOUND_WEBHOOK_URL, body));
    for (const [name, value] of Object.entries(headers)) {
      req = req.set(name, value);
    }
    return req.send(body);
  }

  /** The coach adds a phone in the portal and gets its code. */
  async function startLink(phone: string, ownerUserId = 'user-1'): Promise<string> {
    const issued = await service.addPhone({ ownerUserId, label: 'Coach', phone });
    return issued.code;
  }

  /** The coach's phone is already linked. */
  async function linkPhone(phone: string): Promise<void> {
    const code = await startLink(phone);
    const outcome = await service.completeFromText({ from: phone, code });
    expect(outcome.matched).toBe(true);
  }

  const wrongCodeFor = (code: string): string => (code === '000000' ? '000001' : '000000');

  const spyEngine = (): { [K in keyof ICoachTextEngine]: ReturnType<typeof vi.fn> } => ({
    handleInbound: vi.fn().mockResolvedValue({ handled: false }),
    handleOptOut: vi.fn().mockResolvedValue(undefined),
    handleOptIn: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    vi.stubEnv('RELAY_INBOUND_SECRET', SECRET);
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', '');

    now = new Date('2026-11-21T18:00:00.000Z');
    const clock = (): Date => now;
    links = new FakeLinkStore();
    consent = new FakeConsent(clock);
    commands = new FakeCommandLog(clock);
    const settings = new FakeSettingsStore();
    const conversations = new FakeConversationStore();
    service = new PhoneLinkService({
      links,
      consent,
      commands,
      notifier: new FakeNotifier(),
      settings,
      now: clock,
    });
    links.addOwner(makeOwner());
    twilioWebhookRoute.setCoachTextEngine(
      new CoachTextEngine({
        linking: service,
        links,
        commands,
        chooser: new AccountChooser({ links, conversations, now: clock }),
        conversations,
        settings,
        now: clock,
      })
    );

    mockSmsService = {
      findByKeyword: vi.fn().mockResolvedValue(null),
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
    twilioWebhookRoute.setCoachTextEngine(null);
    vi.unstubAllEnvs();
  });

  describe('with the switch off', () => {
    beforeEach(() => {
      vi.stubEnv('COACH_TEXT_ENABLED', '');
    });

    it('answers a LINK text as a game keyword and never asks the coach engine', async () => {
      const engine = spyEngine();
      twilioWebhookRoute.setCoachTextEngine(engine);
      const phone = freshPhone();

      const res = await text({ From: phone, Body: 'LINK 123456' });

      expect(res.status).toBe(200);
      expect(res.text).toBe(GAME_NOT_FOUND);
      expect(mockSmsService.findByKeyword).toHaveBeenCalledWith('LINK 123456');
      expect(engine.handleInbound).not.toHaveBeenCalled();
    });

    it('does not link a phone that texts the right code', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      const res = await text({ From: phone, Body: `LINK ${code}` });

      expect(res.text).toBe(GAME_NOT_FOUND);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
      expect(commands.rows).toEqual([]);
    });

    it('handles STOP and START as before, without the coach engine', async () => {
      const engine = spyEngine();
      twilioWebhookRoute.setCoachTextEngine(engine);
      const phone = freshPhone();

      const stop = await text({ From: phone, Body: 'STOP' });
      const start = await text({ From: phone, Body: 'START' });

      expect(stop.text).toBe(EMPTY);
      expect(start.text).toBe(EMPTY);
      expect(mockSmsService.handleStop).toHaveBeenCalledWith(phone);
      expect(mockSmsService.handleStart).toHaveBeenCalledWith(phone);
      expect(engine.handleOptOut).not.toHaveBeenCalled();
      expect(engine.handleOptIn).not.toHaveBeenCalled();
    });

    it('leaves a linked phone running when it texts STOP', async () => {
      const phone = freshPhone();
      await linkPhone(phone);

      await text({ From: phone, Body: 'STOP' });

      expect((await service.getStatus('user-1')).phones[0]?.state).toBe('linked');
    });
  });

  describe('a text from someone who is not linking a phone', () => {
    const headerCases: Array<[string, Record<string, string>]> = [
      ['a verified text', VERIFIED],
      ['a text the relay could not verify', { 'x-relay-twilio-verified': '0' }],
      ['a text with no verified header', {}],
    ];

    it.each(headerCases)(
      'sends the payment link for a live game keyword (%s)',
      async (_name, headers) => {
        const phone = freshPhone();
        mockSmsService.findByKeyword.mockResolvedValue({ id: 'game-1', state: 'active' });

        const res = await text({ From: phone, Body: 'game1' }, headers);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/xml');
        expect(res.text).toBe(EMPTY);
        expect(mockSmsService.findByKeyword).toHaveBeenCalledWith('GAME1');
        expect(mockSmsService.recordKeywordConsent).toHaveBeenCalledWith(phone);
        expect(mockSmsService.sendPaymentLink).toHaveBeenCalledWith(
          'game-1',
          phone,
          expect.stringMatching(/\/checkout\/game-1$/)
        );
        expect(mockSmsService.logSmsMessage).toHaveBeenCalledWith(
          expect.objectContaining({ direction: 'inbound', phoneE164: phone, keywordCode: 'GAME1' })
        );
        expect(commands.rows).toEqual([]);
      }
    );

    it.each(headerCases)(
      'answers "game not found" for an unknown keyword (%s)',
      async (_name, headers) => {
        const phone = freshPhone();

        const res = await text({ From: phone, Body: 'NOPE' }, headers);

        expect(res.status).toBe(200);
        expect(res.text).toBe(GAME_NOT_FOUND);
        expect(mockSmsService.sendPaymentLink).not.toHaveBeenCalled();
        expect(commands.rows).toEqual([]);
      }
    );

    it.each(headerCases)(
      'answers "not available" for a game that is over (%s)',
      async (_name, headers) => {
        const phone = freshPhone();
        mockSmsService.findByKeyword.mockResolvedValue({ id: 'game-2', state: 'ended' });

        const res = await text({ From: phone, Body: 'GAME2' }, headers);

        expect(res.status).toBe(200);
        expect(res.text).toBe(GAME_NOT_AVAILABLE);
        expect(mockSmsService.sendPaymentLink).not.toHaveBeenCalled();
        expect(commands.rows).toEqual([]);
      }
    );

    it('still handles YES and an empty text before the coach engine', async () => {
      const engine = spyEngine();
      twilioWebhookRoute.setCoachTextEngine(engine);
      const phone = freshPhone();

      const yes = await text({ From: phone, Body: 'yes' });
      const empty = await text({ From: phone, Body: '   ' });

      expect(yes.text).toBe(EMPTY);
      expect(empty.text).toBe(EMPTY);
      expect(mockSmsService.handleYes).toHaveBeenCalledWith(phone);
      expect(engine.handleInbound).not.toHaveBeenCalled();
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });

    it('hands the coach engine the text as it was sent', async () => {
      const engine = spyEngine();
      twilioWebhookRoute.setCoachTextEngine(engine);
      const phone = freshPhone();

      const res = await text({ From: phone, Body: '  Score 3-1 ', MessageSid: 'SMabc' });

      expect(res.text).toBe(GAME_NOT_FOUND);
      expect(engine.handleInbound).toHaveBeenCalledTimes(1);
      expect(engine.handleInbound).toHaveBeenCalledWith({
        from: phone,
        body: 'Score 3-1',
        messageSid: 'SMabc',
        twilioVerified: true,
        receivedAtMs: expect.any(Number) as number,
      });
      expect(mockSmsService.findByKeyword).toHaveBeenCalledWith('SCORE 3-1');
    });

    it('answers with the coach reply and skips the viewer path when the engine handles the text', async () => {
      const engine = spyEngine();
      engine.handleInbound.mockResolvedValue({
        handled: true,
        twiml: '<Response><Message>done</Message></Response>',
      });
      twilioWebhookRoute.setCoachTextEngine(engine);

      const res = await text({ From: freshPhone(), Body: 'SCORE 3-1' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(res.text).toBe('<Response><Message>done</Message></Response>');
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });
  });

  describe('LINK <code>', () => {
    it('links the phone when the relay verified the text', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      const res = await text({ From: phone, Body: `LINK ${code}` });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(res.text).toBe(LINKED);
      expect(links.rowsFor('user-1')[0]).toMatchObject({ phoneE164: phone, codeHash: null, verifiedAt: now });
      expect(consent.get(phone, 'owner_commands')).toMatchObject({ revokedAt: null });
      expect((await service.getStatus('user-1')).phones[0]?.state).toBe('linked');
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
      expect(mockSmsService.sendPaymentLink).not.toHaveBeenCalled();
    });

    it('accepts the code in lower case with extra spaces', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      const res = await text({ From: phone, Body: `  link  ${code} ` });

      expect(res.text).toBe(LINKED);
    });

    it('never stores the code in the log', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      await text({ From: phone, Body: `LINK ${code}` });

      expect(commands.rows).toHaveLength(1);
      expect(commands.rows[0]).toMatchObject({
        body: 'LINK ******',
        interpreter: 'link',
        status: 'done',
        ownerUserId: 'user-1',
      });
      expect(JSON.stringify(commands.rows)).not.toContain(code);
    });

    it.each([
      ['the relay could not verify the text', { 'x-relay-twilio-verified': '0' }],
      ['the verified header is missing', {}],
      ['the verified header is not exactly 1', { 'x-relay-twilio-verified': 'true' }],
    ] as Array<[string, Record<string, string>]>)(
      'does not link when %s, and answers as the viewer path does',
      async (_name, headers) => {
        const phone = freshPhone();
        const code = await startLink(phone);

        const res = await text({ From: phone, Body: `LINK ${code}` }, headers);

        expect(res.status).toBe(200);
        expect(res.text).toBe(GAME_NOT_FOUND);
        expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
        expect(commands.rows).toHaveLength(1);
        expect(commands.rows[0]).toMatchObject({
          body: '[not verified]',
          status: 'rejected',
          reason: 'unverified',
          messageSid: null,
        });
        expect((await service.getStatus('user-1')).phones[0]?.unverifiedTextSeen).toBe(true);
      }
    );

    it('does not link a verified text that carries no message id', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      const res = await text({ From: phone, Body: `LINK ${code}`, MessageSid: '' });

      expect(res.text).toBe(GAME_NOT_FOUND);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
      expect(commands.rows).toHaveLength(1);
      expect(commands.rows[0]).toMatchObject({ status: 'rejected', reason: 'no_message_sid' });
    });

    it('answers the same way for a wrong code', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      const res = await text({ From: phone, Body: `LINK ${wrongCodeFor(code)}` });

      expect(res.status).toBe(200);
      expect(res.text).toBe(NO_MATCH);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });

    it('answers the same way for a code that has expired', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);
      advance(11 * MINUTE);

      const res = await text({ From: phone, Body: `LINK ${code}` });

      expect(res.text).toBe(NO_MATCH);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
    });

    it('answers the same way on the sixth try, even with the right code', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);

      for (let i = 0; i < 5; i++) {
        const wrong = await text({ From: phone, Body: `LINK ${wrongCodeFor(code)}` });
        expect(wrong.text).toBe(NO_MATCH);
      }
      const sixth = await text({ From: phone, Body: `LINK ${code}` });

      expect(sixth.text).toBe(NO_MATCH);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
    });

    it('answers the same way for a phone nobody is linking', async () => {
      const res = await text({ From: freshPhone(), Body: 'LINK 123456' });

      expect(res.text).toBe(NO_MATCH);
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });

    it('answers a text that is delivered twice only once', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);
      const sid = freshSid();

      const first = await text({ From: phone, Body: `LINK ${code}`, MessageSid: sid });
      const second = await text({ From: phone, Body: `LINK ${code}`, MessageSid: sid });

      expect(first.text).toBe(LINKED);
      expect(second.status).toBe(200);
      expect(second.text).toBe(EMPTY);
      expect(commands.rows).toHaveLength(1);
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });

    it('falls through to the viewer path when the link lookup fails', async () => {
      const phone = freshPhone();
      const code = await startLink(phone);
      links.failNext = new Error('database is down');

      const res = await text({ From: phone, Body: `LINK ${code}` });

      expect(res.status).toBe(200);
      expect(res.text).toBe(GAME_NOT_FOUND);
      expect(mockSmsService.findByKeyword).toHaveBeenCalledWith(`LINK ${code}`);
      expect(links.rowsFor('user-1')[0]?.verifiedAt).toBeNull();
    });

    it('falls through to the viewer path when the coach engine throws', async () => {
      const engine = spyEngine();
      engine.handleInbound.mockRejectedValue(new Error('boom'));
      twilioWebhookRoute.setCoachTextEngine(engine);
      mockSmsService.findByKeyword.mockResolvedValue({ id: 'game-1', state: 'live' });
      const phone = freshPhone();

      const res = await text({ From: phone, Body: 'GAME1' });

      expect(res.status).toBe(200);
      expect(res.text).toBe(EMPTY);
      expect(mockSmsService.sendPaymentLink).toHaveBeenCalledWith(
        'game-1',
        phone,
        expect.stringMatching(/\/checkout\/game-1$/)
      );
    });
  });

  describe('ACCOUNT and a digit answer', () => {
    /** The phone texts commands for Diablos FC (user-1) and Hawks FC (user-2). */
    async function onTwoAccounts(phone: string): Promise<void> {
      links.addOwner(
        makeOwner({
          ownerUserId: 'user-2',
          ownerAccountId: 'account-2',
          email: 'hawks@example.com',
          accountName: 'Hawks FC',
        })
      );
      await linkPhone(phone);
      const code = await startLink(phone, 'user-2');
      expect((await service.completeFromText({ from: phone, code })).matched).toBe(true);
    }

    /** What the viewer path answers this text with the feature switched off. */
    async function viewerAnswer(body: string, headers: Record<string, string> = VERIFIED): Promise<string> {
      vi.stubEnv('COACH_TEXT_ENABLED', 'false');
      const res = await text({ From: freshPhone(), Body: body }, headers);
      vi.stubEnv('COACH_TEXT_ENABLED', 'true');
      return res.text;
    }

    it('asks which account, then takes the digit', async () => {
      const phone = freshPhone();
      await onTwoAccounts(phone);

      const asked = await text({ From: phone, Body: 'ACCOUNT' });
      expect(asked.text).toBe(
        '<Response><Message>FieldView.Live: Which account? 1 Diablos FC, 2 Hawks FC. Reply with the number, 0 for none.</Message></Response>'
      );

      const chosen = await text({ From: phone, Body: '2' });
      expect(chosen.text).toMatch(
        /^<Response><Message>FieldView\.Live: Texting for Hawks FC until \d{1,2}:\d{2} [AP]M\. Text ACCOUNT to switch\.<\/Message><\/Response>$/
      );
      expect(mockSmsService.findByKeyword).not.toHaveBeenCalled();
    });

    it('gives a stranger who texts ACCOUNT or a digit exactly what the viewer path gives', async () => {
      const phone = freshPhone();

      const account = await text({ From: phone, Body: 'ACCOUNT' });
      const digit = await text({ From: phone, Body: '2' });

      expect(account.text).toBe(await viewerAnswer('ACCOUNT'));
      expect(digit.text).toBe(await viewerAnswer('2'));
      expect(commands.rows).toEqual([]);
    });

    it('never answers a digit the relay did not verify', async () => {
      const phone = freshPhone();
      await onTwoAccounts(phone);
      await text({ From: phone, Body: 'ACCOUNT' });

      const res = await text({ From: phone, Body: '2' }, {});

      expect(res.text).toBe(await viewerAnswer('2', {}));
    });
  });

  describe('HELP', () => {
    it.each([
      ['on', 'true'],
      ['off', ''],
    ])('answers with XML a parser accepts (switch %s)', async (_name, flag) => {
      vi.stubEnv('COACH_TEXT_ENABLED', flag);
      const helpText = buildInboundHelpTwimlBody();
      expect(helpText).toContain('&');
      mockSmsService.getHelpTwimlBody.mockReturnValue(helpText);
      const phone = freshPhone();

      const res = await text({ From: phone, Body: 'HELP' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(mockSmsService.handleHelp).toHaveBeenCalledWith(phone);

      // Well formed: no bare ampersand and no tag inside the message.
      const match =
        /^<Response><Message>((?:[^<&]|&(?:amp|lt|gt|quot|apos);)*)<\/Message><\/Response>$/.exec(
          res.text
        );
      expect(match).not.toBeNull();
      const said = (match?.[1] ?? '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
      expect(said).toBe(helpText);
    });

    it('keeps a plain help text byte for byte', async () => {
      const res = await text({ From: freshPhone(), Body: 'help' });

      expect(res.text).toBe('<Response><Message>FieldView.Live: help text</Message></Response>');
    });
  });

  describe('STOP and START from a linked phone', () => {
    it('pauses the phone on a verified STOP', async () => {
      const phone = freshPhone();
      await linkPhone(phone);

      const res = await text({ From: phone, Body: 'stop' });

      expect(res.status).toBe(200);
      expect(res.text).toBe(EMPTY);
      expect(mockSmsService.handleStop).toHaveBeenCalledWith(phone);
      expect((await service.getStatus('user-1')).phones[0]?.state).toBe('paused');
      expect(consent.get(phone, 'owner_commands')?.revokedAt).toEqual(now);
    });

    it('pauses the phone when Twilio marks the text as an opt-out', async () => {
      const phone = freshPhone();
      await linkPhone(phone);

      const res = await text({ From: phone, Body: 'please no more', OptOutType: 'STOP' });

      expect(res.text).toBe(EMPTY);
      expect((await service.getStatus('user-1')).phones[0]?.state).toBe('paused');
    });

    it.each([
      ['the relay could not verify the text', { 'x-relay-twilio-verified': '0' }],
      ['the verified header is missing', {}],
    ] as Array<[string, Record<string, string>]>)(
      'does not pause the phone when %s',
      async (_name, headers) => {
        const phone = freshPhone();
        await linkPhone(phone);

        const res = await text({ From: phone, Body: 'STOP' }, headers);

        expect(res.text).toBe(EMPTY);
        expect(mockSmsService.handleStop).toHaveBeenCalledWith(phone);
        expect((await service.getStatus('user-1')).phones[0]?.state).toBe('linked');
        expect(consent.get(phone, 'owner_commands')?.revokedAt).toBeNull();
      }
    );

    it('turns the phone back on with a verified START', async () => {
      const phone = freshPhone();
      await linkPhone(phone);
      await text({ From: phone, Body: 'STOP' });

      const res = await text({ From: phone, Body: 'START' });

      expect(res.text).toBe(EMPTY);
      expect(mockSmsService.handleStart).toHaveBeenCalledWith(phone);
      expect((await service.getStatus('user-1')).phones[0]?.state).toBe('linked');
      expect(consent.get(phone, 'owner_commands')?.revokedAt).toBeNull();
    });

    it('still answers STOP and START when the coach engine throws', async () => {
      const engine = spyEngine();
      engine.handleOptOut.mockRejectedValue(new Error('boom'));
      engine.handleOptIn.mockRejectedValue(new Error('boom'));
      twilioWebhookRoute.setCoachTextEngine(engine);
      const phone = freshPhone();

      const stop = await text({ From: phone, Body: 'STOP' });
      const start = await text({ From: phone, Body: 'START' });

      expect(stop.status).toBe(200);
      expect(stop.text).toBe(EMPTY);
      expect(start.status).toBe(200);
      expect(start.text).toBe(EMPTY);
      expect(engine.handleOptOut).toHaveBeenCalledWith({ from: phone, twilioVerified: true });
      expect(engine.handleOptIn).toHaveBeenCalledWith({ from: phone, twilioVerified: true });
      expect(mockSmsService.handleStop).toHaveBeenCalledWith(phone);
      expect(mockSmsService.handleStart).toHaveBeenCalledWith(phone);
    });
  });
});
