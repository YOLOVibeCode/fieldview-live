/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- supertest's res.body is typed `any` */

/**
 * The owner portal routes for "Text commands". They run here on the real owner
 * auth, the real link service and the real inbound engine, over in-memory stores.
 */
import {
  CoachTextHistorySchema,
  CoachTextLinkStartedSchema,
  CoachTextStatusSchema,
  type CoachTextHistory,
  type CoachTextLinkStarted,
  type CoachTextStatus,
} from '@fieldview/data-model';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { generateToken } from '../../lib/jwt';
import { CoachTextEngine } from '../../modules/coach-text/CoachTextEngine';
import { PhoneLinkService } from '../../modules/coach-text/PhoneLinkService';
import {
  FakeCommandLog,
  FakeConsent,
  FakeLinkStore,
  FakeNotifier,
  makeOwner,
} from '../../modules/coach-text/__tests__/fakes';
import type {
  CoachTextOwner,
  CoachTextResult,
  IOwnerLoginReader,
  OwnerLogin,
} from '../../modules/coach-text/interfaces';
import { createOwnersTextCommandsRouter } from '../owners.text-commands';

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

// The link code limiter (5 per 15 minutes) is covered in owners.text-commands.ratelimit.test.ts.
vi.mock('../../middleware/rateLimit', () => ({
  coachTextLinkRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const BASE = '/api/owners/me/text-commands';
const NUMBER = '+18773435308';
const PHONE = '+12145550100';
const COACH = 'coach@example.com';
const ASSISTANT = 'assistant@example.com';
const START = new Date('2026-11-21T18:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Passes the validation of every route, so a refusal comes from somewhere else. */
const VALID_BODY = { phone: PHONE, timeZone: 'America/Chicago' };

const ROUTES = [
  ['get', ''],
  ['post', '/link'],
  ['delete', '/link'],
  ['patch', ''],
  ['get', '/history'],
] as const;

type Method = (typeof ROUTES)[number][0];

const NOT_TURNED_ON: CoachTextStatus = {
  enabled: false,
  state: 'none',
  productNumber: NUMBER,
  phoneMasked: null,
  pendingPhoneMasked: null,
  codeExpiresAt: null,
  unverifiedTextSeen: false,
  verifiedAt: null,
  lastCommandAt: null,
  timeZone: 'America/Chicago',
  commands: [],
};

const TURNED_OFF: Array<[string, () => void]> = [
  ['the switch is off', () => vi.stubEnv('COACH_TEXT_ENABLED', 'false')],
  [
    'the account is not on the allowlist',
    () => vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-8, account-9'),
  ],
];

class FakeLogins implements IOwnerLoginReader {
  readonly rows: OwnerLogin[] = [];
  lookups = 0;

  findByEmail(email: string): Promise<OwnerLogin | null> {
    this.lookups += 1;
    return Promise.resolve(this.rows.find((row) => row.email === email) ?? null);
  }
}

describe('owner text commands routes', () => {
  let now: Date;
  let links: FakeLinkStore;
  let commands: FakeCommandLog;
  let logins: FakeLogins;
  let service: PhoneLinkService;
  let engine: CoachTextEngine;
  let server: Express;
  let texts = 0;

  /** A login the link store and the session lookup both know. */
  function addLogin(overrides: Partial<CoachTextOwner> = {}): CoachTextOwner {
    const owner = links.addOwner(makeOwner(overrides));
    logins.rows.push({
      ownerUserId: owner.ownerUserId,
      ownerAccountId: owner.ownerAccountId,
      email: owner.email,
      status: owner.loginStatus,
    });
    return owner;
  }

  function call(
    method: Method,
    path: string,
    email: string = COACH,
    ownerAccountId = 'account-1'
  ): request.Test {
    const token = generateToken({ ownerAccountId, email });
    return request(server)[method](`${BASE}${path}`).set('Authorization', `Bearer ${token}`);
  }

  async function statusOf(email: string = COACH): Promise<CoachTextStatus> {
    const res = await call('get', '', email);
    expect(res.status).toBe(200);
    return CoachTextStatusSchema.strict().parse(res.body);
  }

  async function startLink(phone: string, email: string = COACH): Promise<CoachTextLinkStarted> {
    const res = await call('post', '/link', email).send({ phone });
    expect(res.status).toBe(201);
    return CoachTextLinkStartedSchema.strict().parse(res.body);
  }

  async function historyOf(email: string = COACH, query = ''): Promise<CoachTextHistory> {
    const res = await call('get', `/history${query}`, email);
    expect(res.status).toBe(200);
    return CoachTextHistorySchema.strict().parse(res.body);
  }

  /** A text reaching the FieldView number, as the webhook hands it to the engine. */
  function textFrom(from: string, body: string, twilioVerified = true): Promise<CoachTextResult> {
    texts += 1;
    return engine.handleInbound({
      from,
      body,
      messageSid: `SM-routes-${texts}`,
      twilioVerified,
      receivedAtMs: now.getTime(),
    });
  }

  async function linkPhone(phone: string, email: string = COACH): Promise<CoachTextLinkStarted> {
    const started = await startLink(phone, email);
    const answer = await textFrom(phone, `LINK ${started.code}`);
    expect(answer.handled).toBe(true);
    return started;
  }

  /** A finished command in the log, as PR 2 will write them. */
  function logText(ownerUserId: string, body: string, minutesAgo: number): void {
    const n = commands.rows.length + 1;
    commands.rows.push({
      id: `seed-${n}`,
      messageSid: `SM-seed-${n}`,
      phoneE164: PHONE,
      twilioVerified: true,
      body,
      interpreter: 'rules',
      status: 'done',
      reason: null,
      replyText: `FieldView.Live: ${body} is done.`,
      latencyMs: 12,
      ownerUserId,
      ownerAccountId: 'account-1',
      createdAt: new Date(now.getTime() - minutesAgo * MINUTE_MS),
    });
  }

  beforeEach(() => {
    vi.stubEnv('RELAY_INBOUND_SECRET', 'relay-test-secret');
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', '');
    vi.stubEnv('COACH_TEXT_NUMBER_E164', '');
    vi.stubEnv('COACH_TEXT_DEFAULT_TIME_ZONE', '');
    vi.stubEnv('COACH_TEXT_CODE_TTL_SECONDS', '');
    vi.stubEnv('COACH_TEXT_LINK_IDLE_DAYS', '');

    now = START;
    const clock = (): Date => now;
    links = new FakeLinkStore();
    commands = new FakeCommandLog(clock);
    logins = new FakeLogins();
    service = new PhoneLinkService({
      links,
      consent: new FakeConsent(clock),
      commands,
      notifier: new FakeNotifier(),
      now: clock,
    });
    engine = new CoachTextEngine({ linking: service, links, commands, now: clock });
    addLogin();

    server = express();
    server.use(express.json());
    server.use(
      '/api/owners',
      createOwnersTextCommandsRouter({ linking: service, history: commands, logins })
    );
    server.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json(formatErrorResponse(err));
      }
      throw err;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('who may call them', () => {
    it.each(ROUTES)('%s %s is refused without a token', async (method, path) => {
      const res = await request(server)[method](`${BASE}${path}`).send(VALID_BODY);

      expect(res.status).toBe(401);
      expect(logins.lookups).toBe(0);
      expect(links.rows.size).toBe(0);
    });

    it('refuses a token that is not valid', async () => {
      const res = await request(server).get(BASE).set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
      expect(logins.lookups).toBe(0);
    });

    it.each(ROUTES)(
      '%s %s is refused when the login behind the token is gone',
      async (method, path) => {
        const res = await call(method, path, 'gone@example.com').send(VALID_BODY);

        expect(res.status).toBe(401);
        expect(links.rows.size).toBe(0);
      }
    );

    it.each(ROUTES)(
      '%s %s is refused when the token names an account the login is not in',
      async (method, path) => {
        const res = await call(method, path, COACH, 'account-2').send(VALID_BODY);

        expect(res.status).toBe(401);
        expect(links.rows.size).toBe(0);
      }
    );

    it.each(ROUTES)('%s %s is refused for a login that is not active', async (method, path) => {
      addLogin({ ownerUserId: 'user-7', email: 'former@example.com', loginStatus: 'disabled' });

      const res = await call(method, path, 'former@example.com').send(VALID_BODY);

      expect(res.status).toBe(401);
      expect(links.rows.size).toBe(0);
    });
  });

  describe.each(TURNED_OFF)('when %s', (_name, turnOff) => {
    it('the status says it is not turned on, and nothing is read', async () => {
      await linkPhone(PHONE);
      const lookups = logins.lookups;
      const getStatus = vi.spyOn(service, 'getStatus');
      turnOff();

      const res = await call('get', '');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(NOT_TURNED_ON);
      expect(logins.lookups).toBe(lookups);
      expect(getStatus).not.toHaveBeenCalled();
    });

    it.each([
      ['post', '/link'],
      ['patch', ''],
      ['get', '/history'],
    ] as const)('%s %s is refused and nothing is read', async (method, path) => {
      turnOff();

      const res = await call(method, path).send(VALID_BODY);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(logins.lookups).toBe(0);
      expect(links.rows.size).toBe(0);
    });

    it('a linked phone can still be unlinked', async () => {
      await linkPhone(PHONE);
      turnOff();

      const res = await call('delete', '/link');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ unlinked: true });
      expect(links.rowFor('user-1')).toBeUndefined();
    });
  });

  describe('GET /me/text-commands', () => {
    it('is on for an account on the allowlist', async () => {
      vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', 'account-9, ACCOUNT-1');

      expect((await statusOf()).enabled).toBe(true);
    });

    it('shows no link for a login that never linked', async () => {
      expect(await statusOf()).toEqual({ ...NOT_TURNED_ON, enabled: true });
    });

    it('uses the number and the time zone from the settings', async () => {
      vi.stubEnv('COACH_TEXT_NUMBER_E164', '+12145550199');
      vi.stubEnv('COACH_TEXT_DEFAULT_TIME_ZONE', 'America/Denver');

      const status = await statusOf();

      expect(status.productNumber).toBe('+12145550199');
      expect(status.timeZone).toBe('America/Denver');
    });

    it('shows the phone that is waiting, and never the code', async () => {
      const started = await startLink('(214) 555-0100');

      // An exact match: the answer has no field that could carry the code.
      expect(await statusOf()).toEqual({
        ...NOT_TURNED_ON,
        enabled: true,
        state: 'pending',
        pendingPhoneMasked: '(***) ***-0100',
        codeExpiresAt: started.codeExpiresAt,
      });
    });

    it('goes back to no link once the code has run out', async () => {
      await startLink(PHONE);
      now = new Date(START.getTime() + 11 * MINUTE_MS);

      expect(await statusOf()).toEqual({ ...NOT_TURNED_ON, enabled: true });
    });

    it('says when a text came from the phone but could not be verified', async () => {
      const started = await startLink(PHONE);
      await textFrom(PHONE, `LINK ${started.code}`, false);

      const status = await statusOf();

      expect(status.state).toBe('pending');
      expect(status.unverifiedTextSeen).toBe(true);
    });

    it('shows a linked phone', async () => {
      await linkPhone(PHONE);

      expect(await statusOf()).toEqual({
        ...NOT_TURNED_ON,
        enabled: true,
        state: 'linked',
        phoneMasked: '(***) ***-0100',
        verifiedAt: START.toISOString(),
        lastCommandAt: START.toISOString(),
      });
    });

    it('shows a phone that texted STOP as paused, and as linked again after START', async () => {
      await linkPhone(PHONE);

      await engine.handleOptOut({ from: PHONE, twilioVerified: true });
      expect((await statusOf()).state).toBe('paused');

      await engine.handleOptIn({ from: PHONE, twilioVerified: true });
      expect((await statusOf()).state).toBe('linked');
    });

    it('shows a phone that has been quiet for 90 days as expired', async () => {
      await linkPhone(PHONE);
      now = new Date(START.getTime() + 91 * DAY_MS);

      const status = await statusOf();

      expect(status.state).toBe('expired');
      expect(status.phoneMasked).toBe('(***) ***-0100');
    });

    it('shows a login its own link only', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      await linkPhone(PHONE);

      expect((await statusOf(ASSISTANT)).state).toBe('none');
      expect((await statusOf()).state).toBe('linked');
    });
  });

  describe('POST /me/text-commands/link', () => {
    it('makes a code and says where to text it', async () => {
      const res = await call('post', '/link').send({ phone: PHONE });

      expect(res.status).toBe(201);
      const started = CoachTextLinkStartedSchema.strict().parse(res.body);
      expect(started.codeExpiresAt).toBe(new Date(START.getTime() + 10 * MINUTE_MS).toISOString());
      expect(started.productNumber).toBe(NUMBER);
      expect(started.smsHref).toBe(`sms:${NUMBER}?&body=LINK%20${started.code}`);
    });

    it('tells browsers and proxies not to keep the answer', async () => {
      const res = await call('post', '/link').send({ phone: PHONE });

      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('keeps the time zone sent with the phone', async () => {
      const res = await call('post', '/link').send({ phone: PHONE, timeZone: 'America/New_York' });

      expect(res.status).toBe(201);
      expect((await statusOf()).timeZone).toBe('America/New_York');
    });

    it.each([
      ['no phone', {}],
      ['an empty phone', { phone: '' }],
      ['a phone that is not text', { phone: 2145550100 }],
      ['a phone that is far too long', { phone: '2'.repeat(33) }],
      ['a time zone nobody knows', { phone: PHONE, timeZone: 'Mars/Olympus' }],
    ])('refuses %s before anything is read', async (_name, body) => {
      const start = vi.spyOn(service, 'startLink');

      const res = await call('post', '/link').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(start).not.toHaveBeenCalled();
      expect(logins.lookups).toBe(0);
    });

    it.each([
      ['letters', 'call me maybe'],
      ['a number with too few digits', '555-0100'],
      ['a number outside the US and Canada', '+442079460958'],
      ['the FieldView number itself', NUMBER],
    ])('refuses %s as the phone', async (_name, phone) => {
      const res = await call('post', '/link').send({ phone });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(links.rowFor('user-1')?.pendingPhoneE164 ?? null).toBeNull();
    });

    it('answers the same way when another login already uses the number', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      await linkPhone(PHONE, ASSISTANT);

      const res = await call('post', '/link').send({ phone: PHONE });

      expect(res.status).toBe(201);
      CoachTextLinkStartedSchema.strict().parse(res.body);
      // Asking for a code moves nothing. Only the text from the phone does.
      expect((await statusOf(ASSISTANT)).state).toBe('linked');
    });
  });

  describe('DELETE /me/text-commands/link', () => {
    it('unlinks the phone of the caller', async () => {
      await linkPhone(PHONE);

      const res = await call('delete', '/link');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ unlinked: true });
      expect(await statusOf()).toEqual({ ...NOT_TURNED_ON, enabled: true });
    });

    it('says so when there is nothing to unlink', async () => {
      const res = await call('delete', '/link');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ unlinked: false });
    });

    it('drops a code that is still waiting', async () => {
      const started = await startLink(PHONE);

      const res = await call('delete', '/link');
      await textFrom(PHONE, `LINK ${started.code}`);

      expect(res.body).toEqual({ unlinked: true });
      expect((await statusOf()).state).toBe('none');
    });

    it('leaves the other logins of the account alone', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      await linkPhone(PHONE);
      await linkPhone('+12145550101', ASSISTANT);

      await call('delete', '/link');

      expect((await statusOf()).state).toBe('none');
      expect((await statusOf(ASSISTANT)).state).toBe('linked');
    });
  });

  describe('PATCH /me/text-commands', () => {
    it('changes the time zone and answers with the status', async () => {
      await linkPhone(PHONE);

      const res = await call('patch', '').send({ timeZone: 'America/New_York' });

      expect(res.status).toBe(200);
      const status = CoachTextStatusSchema.strict().parse(res.body);
      expect(status.state).toBe('linked');
      expect(status.timeZone).toBe('America/New_York');
      expect((await statusOf()).timeZone).toBe('America/New_York');
    });

    it('keeps a time zone for a login that has not linked yet', async () => {
      const res = await call('patch', '').send({ timeZone: 'America/Denver' });

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('none');
      expect((await statusOf()).timeZone).toBe('America/Denver');
    });

    it('changes the time zone of the caller only', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });

      await call('patch', '').send({ timeZone: 'America/Los_Angeles' });

      expect((await statusOf(ASSISTANT)).timeZone).toBe('America/Chicago');
    });

    it.each([
      ['no time zone', {}],
      ['an empty time zone', { timeZone: '' }],
      ['a time zone nobody knows', { timeZone: 'Mars/Olympus' }],
      ['a time zone that is not text', { timeZone: 42 }],
    ])('refuses %s', async (_name, body) => {
      const setTimeZone = vi.spyOn(service, 'setTimeZone');

      const res = await call('patch', '').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(setTimeZone).not.toHaveBeenCalled();
    });
  });

  describe('GET /me/text-commands/history', () => {
    it('is empty for a login that never texted', async () => {
      expect(await historyOf()).toEqual({ items: [] });
    });

    it('lists the texts of the caller, newest first', async () => {
      logText('user-1', 'Score 2-1', 30);
      logText('user-1', 'Score 3-1', 10);
      logText('user-1', 'Start stream', 20);

      expect(await historyOf()).toEqual({
        items: [
          {
            createdAt: new Date(START.getTime() - 10 * MINUTE_MS).toISOString(),
            body: 'Score 3-1',
            status: 'done',
            replyText: 'FieldView.Live: Score 3-1 is done.',
          },
          {
            createdAt: new Date(START.getTime() - 20 * MINUTE_MS).toISOString(),
            body: 'Start stream',
            status: 'done',
            replyText: 'FieldView.Live: Start stream is done.',
          },
          {
            createdAt: new Date(START.getTime() - 30 * MINUTE_MS).toISOString(),
            body: 'Score 2-1',
            status: 'done',
            replyText: 'FieldView.Live: Score 2-1 is done.',
          },
        ],
      });
    });

    it('shows the linking text with the code hidden', async () => {
      const started = await linkPhone(PHONE);

      const history = await historyOf();

      expect(history.items).toHaveLength(1);
      expect(history.items[0]?.body).toBe('LINK ******');
      expect(history.items[0]?.status).toBe('done');
      expect(history.items[0]?.replyText).toContain('This phone now runs text commands');
      expect(history.items.map((item) => item.body).join(' ')).not.toContain(started.code);
    });

    it('never shows the texts of another login, whatever the request says', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      addLogin({ ownerUserId: 'user-3', email: 'rival@example.com', ownerAccountId: 'account-2' });
      logText('user-1', 'Score 1-0', 5);
      logText('user-2', 'Assistant text', 4);
      logText('user-3', 'Rival text', 3);

      const mine = await historyOf(COACH, '?ownerUserId=user-2&ownerAccountId=account-2');
      const theirs = await historyOf(ASSISTANT);

      expect(mine.items.map((item) => item.body)).toEqual(['Score 1-0']);
      expect(theirs.items.map((item) => item.body)).toEqual(['Assistant text']);
    });

    it('answers 20 texts unless asked for another number', async () => {
      for (let i = 1; i <= 25; i++) {
        logText('user-1', `Text ${i}`, i);
      }

      expect((await historyOf()).items).toHaveLength(20);
      expect((await historyOf(COACH, '?limit=5')).items).toHaveLength(5);
      expect((await historyOf(COACH, '?limit=50')).items).toHaveLength(25);
    });

    it.each(['0', '51', '-1', '1.5', 'many'])('refuses limit=%s', async (limit) => {
      const list = vi.spyOn(commands, 'listForOwnerUser');

      const res = await call('get', `/history?limit=${limit}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(list).not.toHaveBeenCalled();
    });
  });
});
