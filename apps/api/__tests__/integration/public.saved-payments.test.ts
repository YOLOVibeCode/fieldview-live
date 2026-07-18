import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchase: {
      findUnique: vi.fn(),
    },
    ownerAccount: {
      findUnique: vi.fn(),
    },
    viewerSquareCustomer: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/public/saved-payments', () => {
  let request: SuperTest<typeof app>;

  beforeEach(() => {
    request = agent(app);
    vi.clearAllMocks();
  });

  it('returns 400 if purchaseId missing', async () => {
    await request.get('/api/public/saved-payments').expect(400);
  });

  it('returns [] if purchase has no recipient owner', async () => {
    const { prisma } = await import('@/lib/prisma');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (prisma as any).purchase.findUnique.mockResolvedValue({
      viewerId: 'viewer-1',
      recipientOwnerAccountId: null,
    });

    const res = await request
      .get('/api/public/saved-payments?purchaseId=1e3dc6d2-466e-4f36-ab80-fce0f0ff5d07')
      .expect(200);

    expect(res.body.paymentMethods).toEqual([]);
  });
});


