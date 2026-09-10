import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createDirectRouter } from '../direct';

vi.mock('../../middleware/admin-jwt', () => ({
  validateAdminToken: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), update: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    gameScoreboard: { updateMany: vi.fn() },
    ownerAccount: { findUnique: vi.fn() },
  },
}));

const unreadyOwner = {
  relayRecipientKey: null,
  agreementAcceptedVersion: null,
  squareLocationId: null,
  squareAccessTokenEncrypted: null,
  squareTokenExpiresAt: null,
};

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const dsUpdate = prisma.directStream.update as unknown as ReturnType<typeof vi.fn>;
const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
  dsFindUnique.mockResolvedValue({
    id: 'ds-1',
    slug: 'paid-stream',
    ownerAccountId: 'owner-1',
    paywallEnabled: false,
    priceInCents: 0,
  });
  ownerFindUnique.mockResolvedValue(unreadyOwner);
});

describe('POST /api/direct/:slug/settings — payments readiness guard', () => {
  it('returns PAYMENTS_NOT_CONNECTED when enabling paid paywall without connected payments', async () => {
    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('Authorization', 'Bearer test-token')
      .send({ paywallEnabled: true, priceInCents: 500 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENTS_NOT_CONNECTED');
    expect(res.body.error.message).toContain('/owners/payments');
    expect(dsUpdate).not.toHaveBeenCalled();
  });

  it('allows update when paywall remains free', async () => {
    dsUpdate.mockResolvedValue({
      slug: 'paid-stream',
      paywallEnabled: false,
      priceInCents: 0,
      streamUrl: null,
      paywallMessage: null,
      allowSavePayment: false,
      chatEnabled: true,
      scoreboardEnabled: false,
      scoreboardHomeTeam: null,
      scoreboardAwayTeam: null,
      scoreboardHomeColor: null,
      scoreboardAwayColor: null,
      allowViewerScoreEdit: false,
      allowViewerNameEdit: false,
      welcomeMessage: null,
      scheduledStartAt: null,
      sendReminders: false,
      reminderMinutes: 5,
    });

    const res = await request(app())
      .post('/api/direct/paid-stream/settings')
      .set('Authorization', 'Bearer test-token')
      .send({ chatEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
