/**
 * The admin panel save pins a game's stream URL. A URL a person set stays until a
 * person changes or clears it: the camera poller skips pinned pages.
 */
/* eslint-disable @typescript-eslint/unbound-method -- vitest mocks are plain functions */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createDirectRouter } from '../direct';

vi.mock('../../middleware/admin-jwt', () => ({
  validateAdminToken: (req: Request, _res: Response, next: NextFunction) => {
    req.admin = { slug: 'diablos', role: 'admin', via: 'password' };
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), update: vi.fn() },
    directStreamEvent: { findUnique: vi.fn(), update: vi.fn() },
    gameScoreboard: { updateMany: vi.fn() },
    ownerAccount: { findUnique: vi.fn() },
  },
}));

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
const evFindUnique = prisma.directStreamEvent.findUnique as unknown as ReturnType<typeof vi.fn>;
const evUpdate = prisma.directStreamEvent.update as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;

const OLD_URL = 'https://stream.example.com/old.m3u8';
const NEW_URL = 'https://stream.example.com/new.m3u8';

interface EventWrite {
  data: { streamUrl?: string | null; streamUrlPinnedAt?: Date | null };
}

function eventWrite(): EventWrite['data'] {
  const call = evUpdate.mock.calls[0] as [EventWrite] | undefined;
  return call ? call[0].data : {};
}

describe('POST /api/direct/:parent/:event/settings: the stream URL pin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dsFindUnique.mockResolvedValue({ id: 'ds-1', slug: 'diablos', ownerAccountId: 'owner-1', paywallEnabled: false, priceInCents: 0 });
    dsUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'ds-1', slug: 'diablos', ownerAccountId: 'owner-1', paywallEnabled: false, priceInCents: 0, ...data })
    );
    evFindUnique.mockResolvedValue({ id: 'ev-1', eventSlug: 'game-1', streamUrl: OLD_URL, streamUrlPinnedAt: null });
    evUpdate.mockImplementation(({ data }: EventWrite) => Promise.resolve({ id: 'ev-1', ...data }));
    ownerFindUnique.mockResolvedValue({ marketplaceSellerKey: null, paymentsConnectedAt: null });
  });

  const save = (body: Record<string, unknown>) =>
    request(app()).post(`/api/direct/${encodeURIComponent('diablos/game-1')}/settings`).send(body);

  it('pins a new stream URL', async () => {
    const res = await save({ streamUrl: NEW_URL });

    expect(res.status).toBe(200);
    expect(eventWrite()).toMatchObject({ streamUrl: NEW_URL, streamUrlPinnedAt: expect.any(Date) as Date });
  });

  it('clears the pin when the URL is cleared', async () => {
    evFindUnique.mockResolvedValue({ id: 'ev-1', eventSlug: 'game-1', streamUrl: OLD_URL, streamUrlPinnedAt: new Date() });

    const res = await save({ streamUrl: null });

    expect(res.status).toBe(200);
    expect(eventWrite()).toMatchObject({ streamUrl: null, streamUrlPinnedAt: null });
  });

  it('leaves the pin alone when the form sends the URL the page already has', async () => {
    const res = await save({ streamUrl: OLD_URL, chatEnabled: true });

    expect(res.status).toBe(200);
    expect(eventWrite()).not.toHaveProperty('streamUrlPinnedAt');
  });

  it('leaves the pin alone when the save carries no stream URL', async () => {
    const res = await save({ chatEnabled: false });

    expect(res.status).toBe(200);
    expect(eventWrite()).not.toHaveProperty('streamUrlPinnedAt');
  });
});
