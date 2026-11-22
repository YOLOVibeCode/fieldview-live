/**
 * Each new code brings a fresh set of tries at guessing it, so codes are limited
 * per owner account, whether they come from adding a phone or asking for a new
 * code. This file uses the real limiter and the real owner auth.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { generateToken } from '../../lib/jwt';
import { PhoneLinkService } from '../../modules/coach-text/PhoneLinkService';
import {
  FakeCommandLog,
  FakeConsent,
  FakeLinkStore,
  FakeNotifier,
  FakeSettingsStore,
  makeOwner,
} from '../../modules/coach-text/__tests__/fakes';
import type { IOwnerLoginReader, OwnerLogin } from '../../modules/coach-text/interfaces';
import { createOwnersTextCommandsRouter } from '../owners.text-commands';

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

const PHONES_URL = '/api/owners/me/text-commands/phones';
const LIMIT = 10;

describe('codes for text command phones, limit per account', () => {
  let links: FakeLinkStore;
  let loginRows: OwnerLogin[];
  let service: PhoneLinkService;
  let server: Express;

  /** Each test uses its own accounts: the limiter keeps its counts for the whole file. */
  function addLogin(ownerUserId: string, ownerAccountId: string): string {
    const email = `${ownerUserId}@example.com`;
    links.addOwner(makeOwner({ ownerUserId, ownerAccountId, email }));
    loginRows.push({ ownerUserId, ownerAccountId, email, status: 'active' });
    return `Bearer ${generateToken({ ownerAccountId, email })}`;
  }

  /** The same waiting number each time: a fresh code on the same row. */
  function askForCode(authorization: string, body: object = { label: 'Jordan', phone: '+12145550142' }) {
    return request(server).post(PHONES_URL).set('Authorization', authorization).send(body);
  }

  beforeEach(() => {
    vi.stubEnv('COACH_TEXT_ENABLED', 'true');
    vi.stubEnv('COACH_TEXT_OWNER_ALLOWLIST', '');

    links = new FakeLinkStore();
    loginRows = [];
    const logins: IOwnerLoginReader = {
      findByEmail: (email) => Promise.resolve(loginRows.find((row) => row.email === email) ?? null),
    };
    service = new PhoneLinkService({
      links,
      consent: new FakeConsent(),
      commands: new FakeCommandLog(),
      notifier: new FakeNotifier(),
      settings: new FakeSettingsStore(),
    });

    server = express();
    server.use(express.json());
    server.use('/api/owners', createOwnersTextCommandsRouter({ linking: service, logins }));
    server.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json(formatErrorResponse(err));
      }
      throw err;
    });

    return () => {
      vi.unstubAllEnvs();
    };
  });

  it('stops an account after ten codes, and does not affect another account', async () => {
    const add = vi.spyOn(service, 'addPhone');
    const accountA = addLogin('limit-user-a', 'limit-account-a');
    const accountB = addLogin('limit-user-b', 'limit-account-b');

    for (let i = 0; i < LIMIT; i++) {
      expect((await askForCode(accountA)).status).toBe(201);
    }
    expect(add).toHaveBeenCalledTimes(LIMIT);

    const eleventh = await askForCode(accountA);
    expect(eleventh.status).toBe(429);
    expect(add).toHaveBeenCalledTimes(LIMIT);

    expect((await askForCode(accountB)).status).toBe(201);
    expect(add).toHaveBeenCalledTimes(LIMIT + 1);
  });

  it('counts a new code for a waiting phone against the same limit', async () => {
    const account = addLogin('newcode-user', 'newcode-account');
    const first = await askForCode(account);
    const id = (first.body as { id: string }).id;

    for (let i = 1; i < LIMIT; i++) {
      const res = await request(server).post(`${PHONES_URL}/${id}/code`).set('Authorization', account);
      expect(res.status).toBe(200);
    }

    const refused = await request(server).post(`${PHONES_URL}/${id}/code`).set('Authorization', account);
    expect(refused.status).toBe(429);
  });

  it('says why in the shape every other error has, so the page can show it', async () => {
    const account = addLogin('reason-user', 'reason-account');
    for (let i = 0; i < LIMIT; i++) {
      await askForCode(account);
    }

    const refused = await askForCode(account);

    expect(refused.status).toBe(429);
    expect(refused.body).toEqual({
      error: {
        code: 'RATE_LIMIT',
        message: 'Too many link attempts, please try again later.',
      },
    });
    expect(JSON.stringify(refused.body)).not.toMatch(/\d{6}/);
  });

  it('counts the logins of one account together', async () => {
    const first = addLogin('shared-user-1', 'shared-account');
    const second = addLogin('shared-user-2', 'shared-account');

    for (let i = 0; i < 6; i++) {
      expect((await askForCode(first)).status).toBe(201);
    }
    for (let i = 0; i < 4; i++) {
      expect((await askForCode(second)).status).toBe(201);
    }

    expect((await askForCode(second)).status).toBe(429);
    expect((await askForCode(first)).status).toBe(429);
  });

  it('does not count a request that fails validation', async () => {
    const account = addLogin('typo-user', 'typo-account');

    for (let i = 0; i < LIMIT + 3; i++) {
      expect((await askForCode(account, { label: 'Jordan', phone: '' })).status).toBe(400);
    }

    expect((await askForCode(account)).status).toBe(201);
  });

  it('counts a number the service turns down', async () => {
    const account = addLogin('guess-user', 'guess-account');

    for (let i = 0; i < LIMIT; i++) {
      expect((await askForCode(account, { label: 'Abroad', phone: '+442079460958' })).status).toBe(400);
    }

    expect((await askForCode(account)).status).toBe(429);
  });
});
