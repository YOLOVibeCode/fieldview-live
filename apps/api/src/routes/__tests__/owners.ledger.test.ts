import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createOwnersLedgerRouter } from '../owners.ledger';

vi.mock('../../middleware/auth', () => ({
  requireOwnerAuth: (req: Request & { ownerAccountId?: string }, _res: Response, next: NextFunction) => {
    req.ownerAccountId = 'owner-1';
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    ledgerEntry: {
      findMany: vi.fn(),
    },
    purchase: {
      findMany: vi.fn(),
    },
  },
}));

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/owners', createOwnersLedgerRouter());
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

const ledgerFindMany = prisma.ledgerEntry.findMany as unknown as ReturnType<typeof vi.fn>;
const purchaseFindMany = prisma.purchase.findMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  ledgerFindMany.mockResolvedValue([]);
});

describe('GET /api/owners/me/ledger', () => {
  it('returns purchases and totals for paid purchases', async () => {
    purchaseFindMany.mockResolvedValue([
      {
        id: 'p1',
        amountCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
        ownerNetCents: 841,
      },
    ]);

    const res = await request(app()).get('/api/owners/me/ledger');

    expect(res.status).toBe(200);
    expect(res.body.purchases).toEqual([
      {
        purchaseId: 'p1',
        grossCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
        ownerNetCents: 841,
      },
    ]);
    expect(res.body.totals).toEqual({
      grossCents: 1000,
      platformFeeCents: 100,
      processorFeeCents: 59,
      ownerNetCents: 841,
    });
    expect(res.body.entries).toEqual([]);
  });

  it('returns zero totals when owner has no paid purchases', async () => {
    purchaseFindMany.mockResolvedValue([]);

    const res = await request(app()).get('/api/owners/me/ledger');

    expect(res.status).toBe(200);
    expect(res.body.purchases).toEqual([]);
    expect(res.body.totals).toEqual({
      grossCents: 0,
      platformFeeCents: 0,
      processorFeeCents: 0,
      ownerNetCents: 0,
    });
  });
});
