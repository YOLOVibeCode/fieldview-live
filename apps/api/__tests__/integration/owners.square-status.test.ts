import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { verifyToken } from '@/lib/jwt';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownerAccount: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/owners/me/square/status', () => {
  let request: SuperTest<typeof app>;

  beforeEach(() => {
    request = agent(app);
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    await request.get('/api/owners/me/square/status').expect(401);
  });

  it('returns status for authenticated owner', async () => {
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'owner-1',
      email: 'test@example.com',
    });

    const { prisma } = await import('@/lib/prisma');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (prisma as any).ownerAccount.findUnique.mockResolvedValue({
      id: 'owner-1',
      payoutProviderRef: 'MERCHANT-1',
      squareAccessTokenEncrypted: 'enc:token',
      squareRefreshTokenEncrypted: 'enc:refresh',
      squareTokenExpiresAt: new Date(Date.now() + 60_000),
      squareLocationId: 'LOC-1',
    });

    const res = await request
      .get('/api/owners/me/square/status')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.body.connected).toBe(true);
    expect(res.body.merchantId).toBe('MERCHANT-1');
    expect(res.body.hasLocationId).toBe(true);
    expect(res.body.needsReconnect).toBe(false);
  });
});


