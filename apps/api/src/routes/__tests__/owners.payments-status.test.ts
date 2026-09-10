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
    buildAuthorizeUrl: () => 'https://relay/oauth',
    acceptAgreement: vi.fn(),
    getFrontendConfig: vi.fn(),
    getRecipientStatus: vi.fn().mockResolvedValue({
      connected: true,
      recipientKey: 'owner-1',
      merchantId: 'ML1',
      connectedAt: '2026-09-10T00:00:00.000Z',
      agreementVersionAccepted: 'v1',
    }),
    ...overrides,
  };
}

describe('GET /api/owners/me/payments/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRelayService(relayStub());
  });

  it('includes squareLocationId as locationId so Ready state survives refresh', async () => {
    ownerFindUnique.mockResolvedValue({
      id: 'owner-1',
      relayRecipientKey: 'owner-1',
      agreementAcceptedVersion: 'v1',
      squareLocationId: 'LOC1',
      paymentsConnectedAt: new Date('2026-09-10T00:00:00.000Z'),
    });

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(res.status).toBe(200);
    expect(res.body.locationId).toBe('LOC1');
    expect(res.body.connected).toBe(true);
    expect(res.body.agreementAccepted).toBe(true);
  });

  it('returns locationId null when the coach has not saved a location', async () => {
    ownerFindUnique.mockResolvedValue({
      id: 'owner-1',
      relayRecipientKey: 'owner-1',
      agreementAcceptedVersion: 'v1',
      squareLocationId: null,
      paymentsConnectedAt: null,
    });

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(res.status).toBe(200);
    expect(res.body.locationId).toBeNull();
  });
});
