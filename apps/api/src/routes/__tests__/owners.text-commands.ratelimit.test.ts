/**
 * Each new link code brings a fresh set of tries at guessing it, so codes are
 * limited per owner account. This file uses the real limiter and the real owner auth.
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
  makeOwner,
} from '../../modules/coach-text/__tests__/fakes';
import type { IOwnerLoginReader, OwnerLogin } from '../../modules/coach-text/interfaces';
import { createOwnersTextCommandsRouter } from '../owners.text-commands';

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

const LINK_URL = '/api/owners/me/text-commands/link';

describe('POST /api/owners/me/text-commands/link, code limit', () => {
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

  function askForCode(authorization: string, body: object = { phone: '+12145550100' }) {
    return request(server).post(LINK_URL).set('Authorization', authorization).send(body);
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

  it('stops an account after five codes, and does not affect another account', async () => {
    const start = vi.spyOn(service, 'startLink');
    const accountA = addLogin('limit-user-a', 'limit-account-a');
    const accountB = addLogin('limit-user-b', 'limit-account-b');

    for (let i = 0; i < 5; i++) {
      expect((await askForCode(accountA)).status).toBe(201);
    }
    expect(start).toHaveBeenCalledTimes(5);

    const sixth = await askForCode(accountA);
    expect(sixth.status).toBe(429);
    expect(start).toHaveBeenCalledTimes(5);

    expect((await askForCode(accountB)).status).toBe(201);
    expect(start).toHaveBeenCalledTimes(6);
  });

  it('counts the logins of one account together', async () => {
    const first = addLogin('shared-user-1', 'shared-account');
    const second = addLogin('shared-user-2', 'shared-account');

    for (let i = 0; i < 3; i++) {
      expect((await askForCode(first)).status).toBe(201);
    }
    for (let i = 0; i < 2; i++) {
      expect((await askForCode(second)).status).toBe(201);
    }

    expect((await askForCode(second)).status).toBe(429);
    expect((await askForCode(first)).status).toBe(429);
  });

  it('does not count a request that fails validation', async () => {
    const account = addLogin('typo-user', 'typo-account');

    for (let i = 0; i < 8; i++) {
      expect((await askForCode(account, { phone: '' })).status).toBe(400);
    }

    expect((await askForCode(account)).status).toBe(201);
  });

  it('counts a phone the link service turns down', async () => {
    const account = addLogin('guess-user', 'guess-account');

    for (let i = 0; i < 5; i++) {
      expect((await askForCode(account, { phone: '+442079460958' })).status).toBe(400);
    }

    expect((await askForCode(account)).status).toBe(429);
  });
});
