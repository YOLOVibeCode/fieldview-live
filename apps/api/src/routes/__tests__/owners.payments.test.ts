/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- supertest's res.body and Jest matchers are typed `any` */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import type { IMarketplaceStoreOnboarding, MarketplaceSellerStatus } from '../../services/MarketplaceStoreService';
import { createOwnersPaymentsRouter, setMarketplaceStoreService } from '../owners.payments';

vi.mock('../../middleware/auth', () => ({
  requireOwnerAuth: (req: Request & { ownerAccountId?: string }, _res: Response, next: NextFunction) => {
    req.ownerAccountId = 'owner-1';
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

const findById = vi.fn();
const update = vi.fn();
vi.mock('../../repositories/implementations/OwnerAccountRepository', () => ({
  OwnerAccountRepository: vi.fn().mockImplementation(() => ({ findById, update })),
}));

const store = {
  acceptAgreement: vi.fn(),
  buildOnboardingUrl: vi.fn(),
  getSellerStatus: vi.fn(),
} satisfies Record<keyof IMarketplaceStoreOnboarding, ReturnType<typeof vi.fn>>;

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/owners', createOwnersPaymentsRouter());
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

const owner = (over: Record<string, unknown> = {}) => ({
  id: 'owner-1',
  name: 'Coach Williams',
  contactEmail: 'coach@example.com',
  marketplaceSellerKey: null,
  paymentsConnectedAt: null,
  payoutProviderRef: null,
  ...over,
});

const relayStatus = (over: Partial<MarketplaceSellerStatus> = {}): MarketplaceSellerStatus => ({
  exists: true,
  connected: true,
  status: 'active',
  chargesEnabled: true,
  payoutsEnabled: true,
  sellerRef: 'sel_1',
  mode: 'live',
  agreementAccepted: true,
  agreementVersion: 'v2',
  agreementAcceptedAt: '2026-11-07T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  setMarketplaceStoreService(store as unknown as IMarketplaceStoreOnboarding);
  findById.mockResolvedValue(owner());
  update.mockImplementation((_id: string, data: Record<string, unknown>) => Promise.resolve({ ...owner(), ...data }));
});

describe('POST /api/owners/me/payments/agreement', () => {
  it('assigns the seller key and records the current agreement version on the relay', async () => {
    store.acceptAgreement.mockResolvedValue({ version: 'v2', acceptedAt: '2026-11-07T00:00:00.000Z' });

    const res = await request(app()).post('/api/owners/me/payments/agreement').send({});

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith('owner-1', { marketplaceSellerKey: 'owner-1' });
    expect(store.acceptAgreement).toHaveBeenCalledWith('owner-1', 'v2');
    expect(res.body).toEqual({ accepted: true, version: 'v2', acceptedAt: '2026-11-07T00:00:00.000Z', sellerKey: 'owner-1' });
  });

  it('passes an explicit version through', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1' }));
    store.acceptAgreement.mockResolvedValue({ version: 'v2', acceptedAt: null });

    const res = await request(app()).post('/api/owners/me/payments/agreement').send({ version: 'v2' });

    expect(res.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(store.acceptAgreement).toHaveBeenCalledWith('owner-1', 'v2');
  });
});

describe('POST /api/owners/me/payments/connect', () => {
  it('asks the relay for an onboarding link that returns to the payments page', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1' }));
    store.buildOnboardingUrl.mockResolvedValue('https://store.test/connect/fieldview/onboard?state=abc');

    const res = await request(app()).post('/api/owners/me/payments/connect').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ onboardingUrl: 'https://store.test/connect/fieldview/onboard?state=abc', sellerKey: 'owner-1' });
    expect(store.buildOnboardingUrl).toHaveBeenCalledWith(
      'owner-1',
      expect.stringMatching(/\/owners\/payments\?payments_connected=true$/),
      { email: 'coach@example.com', productDescription: expect.stringContaining('FieldView') },
    );
  });

  it('relays AGREEMENT_REQUIRED so the console can send the coach back to step 1', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1' }));
    store.buildOnboardingUrl.mockRejectedValue(
      new AppError('AGREEMENT_REQUIRED', 'The seller must accept the marketplace agreement first.', 428),
    );

    const res = await request(app()).post('/api/owners/me/payments/connect').send({});

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe('AGREEMENT_REQUIRED');
  });
});

describe('GET /api/owners/me/payments/status', () => {
  it('is "not started" before the coach has a seller key, without asking the relay', async () => {
    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(res.status).toBe(200);
    expect(store.getSellerStatus).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ sellerKey: null, connected: false, agreementAccepted: false, status: null, connectedAt: null });
  });

  it('reports the agreement step while the relay has no recipient yet', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1' }));
    store.getSellerStatus.mockResolvedValue(relayStatus({ exists: false, connected: false, status: null, chargesEnabled: false, payoutsEnabled: false, sellerRef: null, mode: null, agreementAccepted: false, agreementVersion: null, agreementAcceptedAt: null }));

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(res.body).toMatchObject({ sellerKey: 'owner-1', connected: false, agreementAccepted: false });
    expect(update).not.toHaveBeenCalled();
  });

  it('stamps paymentsConnectedAt the first time the relay reports a charges-enabled seller', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1' }));
    store.getSellerStatus.mockResolvedValue(relayStatus());

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(update).toHaveBeenCalledWith('owner-1', { paymentsConnectedAt: expect.any(Date), payoutProviderRef: 'sel_1' });
    expect(res.body).toMatchObject({
      sellerKey: 'owner-1',
      merchantId: 'sel_1',
      connected: true,
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      agreementAccepted: true,
      agreementVersion: 'v2',
      agreementCurrentVersion: 'v2',
      mode: 'live',
    });
    expect(res.body.connectedAt).toEqual(expect.any(String));
  });

  it('sends a coach whose acceptance is an older version back to the agreement step, without touching the connection', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1', paymentsConnectedAt: new Date('2026-10-01T00:00:00Z'), payoutProviderRef: 'sel_1' }));
    store.getSellerStatus.mockResolvedValue(relayStatus({ agreementVersion: 'v1' }));

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(update).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ connected: true, agreementAccepted: false, agreementVersion: 'v1', agreementCurrentVersion: 'v2' });
  });

  it('clears paymentsConnectedAt when the relay no longer reports the seller as able to charge', async () => {
    findById.mockResolvedValue(owner({ marketplaceSellerKey: 'owner-1', paymentsConnectedAt: new Date('2026-10-01T00:00:00Z'), payoutProviderRef: 'sel_1' }));
    store.getSellerStatus.mockResolvedValue(relayStatus({ connected: false, status: 'restricted', chargesEnabled: false }));

    const res = await request(app()).get('/api/owners/me/payments/status');

    expect(update).toHaveBeenCalledWith('owner-1', { paymentsConnectedAt: null });
    expect(res.body).toMatchObject({ connected: false, connectedAt: null, status: 'restricted' });
  });
});
