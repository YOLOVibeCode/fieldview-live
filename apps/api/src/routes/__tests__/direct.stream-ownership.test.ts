/**
 * Who may create a stream page, and who may set what viewers pay.
 *
 * - A page exists only when its owner (or a super admin) created it. Opening an
 *   unknown address must not create one: an anonymous caller would get a page
 *   under someone else's account.
 * - The page's admin password runs the page (stream URL, chat, scoreboard).
 *   Price and paywall decide what viewers pay the owner, so only the owner's own
 *   login may change them.
 */
/* eslint-disable @typescript-eslint/unbound-method -- vitest mocks are plain functions */
import bcrypt from 'bcryptjs';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { verifyToken } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';
import { createDirectRouter } from '../direct';

type UnlockBody = { token?: string; canEditPayments?: boolean };
type ErrorBody = { error?: { code?: string } };

vi.mock('../../middleware/admin-jwt', () => ({
  // The real middleware verifies the JWT; here the test names the access type.
  validateAdminToken: (req: Request, _res: Response, next: NextFunction) => {
    const via = req.headers['x-test-admin-via'];
    req.admin = {
      slug: 'paid-stream',
      role: 'admin',
      ...(via === 'owner' || via === 'password' ? { via } : {}),
    };
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    game: { findFirst: vi.fn(), create: vi.fn() },
    gameScoreboard: { updateMany: vi.fn() },
    ownerAccount: { findFirst: vi.fn(), findUnique: vi.fn() },
    viewerIdentity: { upsert: vi.fn() },
  },
}));

vi.mock('../../lib/jwt', () => ({ verifyToken: vi.fn() }));
vi.mock('../../lib/viewer-jwt', () => ({ generateViewerToken: vi.fn(() => 'viewer-token') }));
vi.mock('../../lib/ensure-game', () => ({ ensureGameForDirectStream: vi.fn(() => Promise.resolve('game-1')) }));

const JWT_SECRET = 'test-secret-for-stream-ownership';

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    return res.status(500).json({ error: { code: 'UNEXPECTED', message: String(err) } });
  });
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const dsUpdate = prisma.directStream.update as unknown as ReturnType<typeof vi.fn>;
const dsCreate = prisma.directStream.create as unknown as ReturnType<typeof vi.fn>;
const gameCreate = prisma.game.create as unknown as ReturnType<typeof vi.fn>;
const ownerFindFirst = prisma.ownerAccount.findFirst as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;
const viewerUpsert = prisma.viewerIdentity.upsert as unknown as ReturnType<typeof vi.fn>;
const verifyOwnerToken = verifyToken as unknown as ReturnType<typeof vi.fn>;

const connectedOwner = {
  marketplaceSellerKey: 'seller-owner-1',
  paymentsConnectedAt: new Date('2026-11-09T03:56:42Z'),
};

let passwordHash = '';
const previousJwtSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  passwordHash = await bcrypt.hash('right-password', 4);
});

// Other test files share this worker's environment: put the secret back.
afterAll(() => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  ownerFindFirst.mockResolvedValue({ id: 'owner-1' });
  ownerFindUnique.mockResolvedValue(connectedOwner);
  viewerUpsert.mockResolvedValue({ id: 'viewer-1' });
  dsCreate.mockResolvedValue({ id: 'should-not-exist' });
  gameCreate.mockResolvedValue({ id: 'should-not-exist' });
});

describe('GET /api/direct/:slug/bootstrap for an address nobody created', () => {
  it('answers 404 and creates no page or game', async () => {
    dsFindUnique.mockResolvedValue(null);

    const res = await request(app()).get('/api/direct/made-up-page/bootstrap');

    expect(res.status).toBe(404);
    expect(dsCreate).not.toHaveBeenCalled();
    expect(gameCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/direct/:slug (old stream URL route) for an address nobody created', () => {
  it('answers 404 and creates no page, whatever password is sent', async () => {
    dsFindUnique.mockResolvedValue(null);

    const res = await request(app())
      .post('/api/direct/made-up-page')
      .send({ streamUrl: 'https://example.com/live.m3u8', password: 'chosen-by-caller' });

    expect(res.status).toBe(404);
    expect(dsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/direct/:slug/unlock-admin', () => {
  beforeEach(() => {
    dsFindUnique.mockResolvedValue({
      id: 'ds-1',
      title: 'Paid stream',
      adminPassword: passwordHash,
      ownerAccountId: 'owner-1',
      scheduledStartAt: null,
      priceInCents: 500,
      gameId: 'game-1',
    });
  });

  it('marks a password unlock as password access, without payment control', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/unlock-admin')
      .send({ password: 'right-password' });

    expect(res.status).toBe(200);
    expect((res.body as UnlockBody).canEditPayments).toBe(false);
    const payload = jwt.verify(String((res.body as UnlockBody).token), JWT_SECRET) as { via?: string };
    expect(payload.via).toBe('password');
  });

  it("marks the owner's own login as owner access, with payment control", async () => {
    verifyOwnerToken.mockReturnValue({ ownerAccountId: 'owner-1' });

    const res = await request(app())
      .post('/api/direct/paid-stream/unlock-admin')
      .set('Authorization', 'Bearer owner-login-token')
      .send({});

    expect(res.status).toBe(200);
    expect((res.body as UnlockBody).canEditPayments).toBe(true);
    const payload = jwt.verify(String((res.body as UnlockBody).token), JWT_SECRET) as { via?: string };
    expect(payload.via).toBe('owner');
  });
});

describe('POST /api/direct/:slug/settings: price and paywall belong to the owner', () => {
  beforeEach(() => {
    dsFindUnique.mockResolvedValue({
      id: 'ds-1',
      slug: 'paid-stream',
      ownerAccountId: 'owner-1',
      paywallEnabled: true,
      priceInCents: 500,
    });
    dsUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({
      id: 'ds-1',
      slug: 'paid-stream',
      ownerAccountId: 'owner-1',
      paywallEnabled: true,
      priceInCents: 500,
      ...data,
    }));
  });

  it('refuses a price change made with the page password', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('x-test-admin-via', 'password')
      .send({ priceInCents: 1000 });

    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error?.code).toBe('OWNER_LOGIN_REQUIRED');
    expect(dsUpdate).not.toHaveBeenCalled();
  });

  it('refuses turning the paywall off with the page password', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('x-test-admin-via', 'password')
      .send({ paywallEnabled: false });

    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error?.code).toBe('OWNER_LOGIN_REQUIRED');
    expect(dsUpdate).not.toHaveBeenCalled();
  });

  it('refuses turning the paywall on with the page password', async () => {
    dsFindUnique.mockResolvedValue({
      id: 'ds-1',
      slug: 'paid-stream',
      ownerAccountId: 'owner-1',
      paywallEnabled: false,
      priceInCents: 0,
    });

    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('x-test-admin-via', 'password')
      .send({ paywallEnabled: true, priceInCents: 2500 });

    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error?.code).toBe('OWNER_LOGIN_REQUIRED');
    expect(dsUpdate).not.toHaveBeenCalled();
  });

  it('treats a token that does not say how it was issued as password access', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .send({ priceInCents: 1000 });

    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error?.code).toBe('OWNER_LOGIN_REQUIRED');
  });

  it('still saves the other settings with the page password when the price is sent unchanged', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('x-test-admin-via', 'password')
      .send({ chatEnabled: true, paywallEnabled: true, priceInCents: 500 });

    expect(res.status).toBe(200);
    expect(dsUpdate).toHaveBeenCalledTimes(1);
  });

  it('lets the owner change the price', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('x-test-admin-via', 'owner')
      .send({ priceInCents: 1000 });

    expect(res.status).toBe(200);
    expect(dsUpdate).toHaveBeenCalledTimes(1);
  });
});
