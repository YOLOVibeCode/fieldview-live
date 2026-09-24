import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

import { errorHandler } from '../../middleware/errorHandler';
import { createOwnersPaymentsRouter, setRelayService } from '../owners.payments';
import type { IRelayConnectOnboarding } from '../../services/IRelayConnectHubService';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    ownerAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../middleware/auth', () => ({
  requireOwnerAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { ownerAccountId?: string }).ownerAccountId = 'owner-1';
    next();
  },
}));

const ownerFindUnique = prisma.ownerAccount.findUnique as unknown as ReturnType<typeof vi.fn>;

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/owners', createOwnersPaymentsRouter());
  a.use(errorHandler);
  return a;
}

function relayStub(overrides: Partial<IRelayConnectOnboarding> = {}): IRelayConnectOnboarding {
  return {
    onboard: vi.fn(),
    acceptAgreement: vi.fn(),
    getRecipientStatus: vi.fn().mockResolvedValue({
      connected: true,
      recipientKey: 'owner-1',
      stripeAccountId: 'acct_1',
      connectedAt: '2026-09-10T00:00:00.000Z',
      agreementVersionAccepted: 'v1',
    }),
    ...overrides,
  };
}

describe('GET /api/owners/me/payments/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PAYMENTS_VIA_RELAY', 'true');
    setRelayService(relayStub());
  });

  it('returns stripeAccountId and requiresLocationId false when relay payments are enabled', async () => {
    ownerFindUnique.mockResolvedValue({
      id: 'owner-1',
      relayRecipientKey: 'owner-1',
      agreementAcceptedVersion: 'v1',
      squareLocationId: null,
      paymentsConnectedAt: new Date('2026-09-10T00:00:00.000Z'),
    });

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(res.status).toBe(200);
    expect(res.body.stripeAccountId).toBe('acct_1');
    expect(res.body.connected).toBe(true);
    expect(res.body.requiresLocationId).toBe(false);
  });
});
