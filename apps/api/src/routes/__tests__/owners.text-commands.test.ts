/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- supertest's res.body is typed `any` */

/**
 * The owner portal routes for "Text commands". They run here on the real owner
 * auth, the real phone list service and the real inbound engine, over in-memory stores.
 */
import {
  CoachTextHistorySchema,
  CoachTextPhoneCodeSchema,
  CoachTextStatusSchema,
  type CoachTextHistory,
  type CoachTextPhoneCode,
  type CoachTextStatus,
} from '@fieldview/data-model';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { generateToken } from '../../lib/jwt';
import { AccountChooser } from '../../modules/coach-text/AccountChooser';
import { CoachTextEngine } from '../../modules/coach-text/CoachTextEngine';
import { PhoneLinkService } from '../../modules/coach-text/PhoneLinkService';
import {
  FakeCommandLog,
  FakeConsent,
  FakeConversationStore,
  FakeLinkStore,
  FakeNotifier,
  FakeSettingsStore,
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

// The code limiter (10 per 15 minutes) is covered in owners.text-commands.ratelimit.test.ts.
vi.mock('../../middleware/rateLimit', () => ({
  coachTextLinkRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const BASE = '/api/owners/me/text-commands';
const NUMBER = '+18773435308';
const PHONE = '+12145550100';
const HELPER = '+12145550142';
const COACH = 'coach@example.com';
const ASSISTANT = 'assistant@example.com';
const START = new Date('2026-11-22T18:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const UNKNOWN_ID = '9b2f6a1e-3c4d-4e5f-8a9b-0c1d2e3f4a5b';

const NOT_TURNED_ON: CoachTextStatus = {
  enabled: false,
  productNumber: NUMBER,
  timeZone: 'America/Chicago',
  maxPhones: 10,
  phones: [],
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
    method: 'get' | 'post' | 'delete' | 'patch',
    path: string,
    email: string = COACH,
    ownerAccountId = 'account-1'
  ): request.Test {
    const token = generateToken({ ownerAccountId, email });
    return request(server)[method](`${BASE}${path}`).set('Authorization', `Bearer ${token}`);
  }

  async function statusOf(email: string = COACH, ownerAccountId = 'account-1'): Promise<CoachTextStatus> {
    const res = await call('get', '', email, ownerAccountId);
    expect(res.status).toBe(200);
    return CoachTextStatusSchema.strict().parse(res.body);
  }

  async function addPhone(
    label: string,
    phone: string,
    email: string = COACH,
    ownerAccountId = 'account-1'
  ): Promise<CoachTextPhoneCode> {
    const res = await call('post', '/phones', email, ownerAccountId).send({ label, phone });
    expect(res.status).toBe(201);
    return CoachTextPhoneCodeSchema.strict().parse(res.body);
  }

  async function historyOf(email: string = COACH): Promise<CoachTextHistory> {
    const res = await call('get', '/history', email);
    expect(res.status).toBe(200);
    return CoachTextHistorySchema.strict().parse(res.body);
  }

  /** A text reaching the FieldView number, as the webhook hands it to the engine. */
  function textFrom(from: string, body: string): Promise<CoachTextResult> {
    texts += 1;
    return engine.handleInbound({
      from,
      body,
      messageSid: `SM-routes-${texts}`,
      twilioVerified: true,
      receivedAtMs: now.getTime(),
    });
  }

  async function linkPhone(label: string, phone: string, email = COACH, ownerAccountId = 'account-1') {
    const issued = await addPhone(label, phone, email, ownerAccountId);
    const answer = await textFrom(phone, `LINK ${issued.code}`);
    expect(answer.handled).toBe(true);
    return issued;
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
    const settings = new FakeSettingsStore();
    const conversations = new FakeConversationStore();
    service = new PhoneLinkService({
      links,
      consent: new FakeConsent(clock),
      commands,
      notifier: new FakeNotifier(),
      settings,
      now: clock,
    });
    engine = new CoachTextEngine({
      linking: service,
      links,
      commands,
      chooser: new AccountChooser({ links, conversations, now: clock }),
      conversations,
      settings,
      now: clock,
    });
    addLogin();

    server = express();
    server.use(express.json());
    server.use('/api/owners', createOwnersTextCommandsRouter({ linking: service, history: commands, logins }));
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

  describe('signing in', () => {
    it.each([
      ['get', ''],
      ['post', '/phones'],
      ['post', `/phones/${UNKNOWN_ID}/code`],
      ['delete', `/phones/${UNKNOWN_ID}`],
      ['patch', ''],
      ['get', '/history'],
    ] as const)('%s %s needs an owner token', async (method, path) => {
      const res = await request(server)[method](`${BASE}${path}`);
      expect(res.status).toBe(401);
    });

    it('refuses a token whose login is gone', async () => {
      logins.rows.length = 0;

      const res = await call('get', '');

      expect(res.status).toBe(401);
    });
  });

  describe('while the feature is off', () => {
    it.each(TURNED_OFF)('answers the status as not turned on when %s', async (_why, turnOff) => {
      turnOff();

      expect(await statusOf()).toEqual(NOT_TURNED_ON);
    });

    it.each(TURNED_OFF)('refuses adding a phone, a new code, the time zone and history when %s', async (_why, turnOff) => {
      turnOff();

      expect((await call('post', '/phones').send({ label: 'Jordan', phone: HELPER })).status).toBe(403);
      expect((await call('post', `/phones/${UNKNOWN_ID}/code`)).status).toBe(403);
      expect((await call('patch', '').send({ timeZone: 'America/Denver' })).status).toBe(403);
      expect((await call('get', '/history')).status).toBe(403);
      expect(links.rows.size).toBe(0);
    });

    it('still removes a phone', async () => {
      const issued = await addPhone('Jordan', HELPER);
      vi.stubEnv('COACH_TEXT_ENABLED', 'false');

      const res = await call('delete', `/phones/${issued.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ removed: true });
      expect(links.rows.size).toBe(0);
    });
  });

  describe('the phone list', () => {
    it('starts empty', async () => {
      expect(await statusOf()).toEqual({ ...NOT_TURNED_ON, enabled: true });
    });

    it('adds a named phone and answers its code once, never cached', async () => {
      const res = await call('post', '/phones').send({ label: 'Jordan', phone: '(214) 555-0142' });

      expect(res.status).toBe(201);
      expect(res.headers['cache-control']).toBe('no-store');
      const issued = CoachTextPhoneCodeSchema.strict().parse(res.body);
      expect(issued.productNumber).toBe(NUMBER);
      expect(issued.smsHref).toBe(`sms:${NUMBER}?&body=LINK%20${issued.code}`);
      expect(issued.codeExpiresAt).toBe(new Date(now.getTime() + 10 * MINUTE_MS).toISOString());

      const status = await statusOf();
      expect(status.phones).toEqual([
        {
          id: issued.id,
          label: 'Jordan',
          phoneMasked: '(***) ***-0142',
          state: 'pending',
          codeExpiresAt: issued.codeExpiresAt,
          verifiedAt: null,
          lastCommandAt: null,
          unverifiedTextSeen: false,
        },
      ]);
      expect(JSON.stringify(status)).not.toContain(issued.code);
    });

    it('lists the coach and a helper once each phone has texted its code', async () => {
      await linkPhone('Ricardo', PHONE);
      await linkPhone('Jordan', HELPER);

      const status = await statusOf();

      expect(status.phones.map((phone) => [phone.label, phone.state])).toEqual([
        ['Ricardo', 'linked'],
        ['Jordan', 'linked'],
      ]);
    });

    const BAD_ADDS: Array<[Record<string, string>, string]> = [
      [{ phone: HELPER }, 'no name'],
      [{ label: '', phone: HELPER }, 'an empty name'],
      [{ label: 'Jordan' }, 'no number'],
      [{ label: 'Jordan', phone: '+44 20 7946 0958' }, 'a number abroad'],
      [{ label: 'Jordan', phone: NUMBER }, 'the FieldView number'],
    ];

    it.each(BAD_ADDS)('refuses %j (%s) with 400', async (body, _why) => {
      const res = await call('post', '/phones').send(body);

      expect(res.status).toBe(400);
      expect(links.rows.size).toBe(0);
    });

    it('refuses a number already linked on this login', async () => {
      await linkPhone('Jordan', HELPER);

      const res = await call('post', '/phones').send({ label: 'Jordan again', phone: HELPER });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHONE_ALREADY_ADDED');
    });

    it('stops at ten phones', async () => {
      for (let n = 0; n < 10; n += 1) {
        await addPhone(`Helper ${n}`, `+1214555011${n}`);
      }

      const res = await call('post', '/phones').send({ label: 'One more', phone: '+12145550199' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHONE_LIMIT_REACHED');
    });
  });

  describe('a new code', () => {
    it('answers a fresh code for a phone still waiting', async () => {
      const first = await addPhone('Jordan', HELPER);

      const res = await call('post', `/phones/${first.id}/code`);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(CoachTextPhoneCodeSchema.strict().parse(res.body).id).toBe(first.id);
    });

    it('refuses a phone that is linked', async () => {
      const issued = await linkPhone('Jordan', HELPER);

      const res = await call('post', `/phones/${issued.id}/code`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHONE_ALREADY_LINKED');
    });

    it("answers 404 for another login's phone, and 400 for an id that is not one", async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      const theirs = await addPhone('Jordan', HELPER, ASSISTANT);

      expect((await call('post', `/phones/${theirs.id}/code`)).status).toBe(404);
      expect((await call('post', '/phones/not-an-id/code')).status).toBe(400);
    });
  });

  describe('removing a phone', () => {
    it('takes one phone off the list and keeps the others', async () => {
      await linkPhone('Ricardo', PHONE);
      const jordan = await linkPhone('Jordan', HELPER);

      const res = await call('delete', `/phones/${jordan.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ removed: true });
      expect((await statusOf()).phones.map((phone) => phone.label)).toEqual(['Ricardo']);
    });

    it("answers 404 for another login's phone and an unknown id", async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      const theirs = await addPhone('Jordan', HELPER, ASSISTANT);

      expect((await call('delete', `/phones/${theirs.id}`)).status).toBe(404);
      expect((await call('delete', `/phones/${UNKNOWN_ID}`)).status).toBe(404);
      expect(links.rows.size).toBe(1);
    });
  });

  describe('two logins of one account', () => {
    it('see and change only their own phones', async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      await linkPhone('Ricardo', PHONE);
      await addPhone('Jordan', HELPER, ASSISTANT);

      expect((await statusOf()).phones.map((phone) => phone.label)).toEqual(['Ricardo']);
      expect((await statusOf(ASSISTANT)).phones.map((phone) => phone.label)).toEqual(['Jordan']);
    });
  });

  describe('one phone on two accounts', () => {
    it('stays linked on both, and each account sees only its own row', async () => {
      addLogin({ ownerUserId: 'user-2', ownerAccountId: 'account-2', email: 'hawks@example.com', accountName: 'Hawks FC' });

      await linkPhone('Jordan', HELPER);
      await linkPhone('Jo', HELPER, 'hawks@example.com', 'account-2');

      expect((await statusOf()).phones).toEqual([expect.objectContaining({ label: 'Jordan', state: 'linked' })]);
      expect((await statusOf('hawks@example.com', 'account-2')).phones).toEqual([
        expect.objectContaining({ label: 'Jo', state: 'linked' }),
      ]);
    });
  });

  describe('the time zone', () => {
    it('is changed for the login and answered in the status', async () => {
      const res = await call('patch', '').send({ timeZone: 'America/Denver' });

      expect(res.status).toBe(200);
      expect(CoachTextStatusSchema.strict().parse(res.body).timeZone).toBe('America/Denver');
      expect((await statusOf()).timeZone).toBe('America/Denver');
    });

    it('refuses an unknown zone', async () => {
      expect((await call('patch', '').send({ timeZone: 'Nowhere/Land' })).status).toBe(400);
    });
  });

  describe('history', () => {
    it("shows the login's own texts with the name of the phone that sent each", async () => {
      await linkPhone('Jordan', HELPER);

      const history = await historyOf();

      expect(history.items).toEqual([
        expect.objectContaining({ body: 'LINK ******', status: 'done', phoneLabel: 'Jordan' }),
      ]);
    });

    it("never shows another login's texts", async () => {
      addLogin({ ownerUserId: 'user-2', email: ASSISTANT });
      await linkPhone('Jordan', HELPER, ASSISTANT);

      expect((await historyOf()).items).toEqual([]);
      expect((await historyOf(ASSISTANT)).items).toHaveLength(1);
    });
  });
});
