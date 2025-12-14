import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { OwnerAccountRepository } from '@/repositories/implementations/OwnerAccountRepository';
import { verifyToken } from '@/lib/jwt';
import * as ownersMeRoute from '@/routes/owners.me';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

describe('GET /api/owners/me', () => {
  let request: SuperTest<typeof app>;
  let mockFindById: ReturnType<typeof vi.fn>;
  let mockRepo: OwnerAccountRepository;

  beforeEach(() => {
    request = agent(app);
    mockFindById = vi.fn();
    mockRepo = {
      findById: mockFindById,
      findByContactEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as any;
    
    // Set the mocked repository
    ownersMeRoute.setOwnerAccountRepo(mockRepo);
  });

  it('returns owner account for valid token', async () => {
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'account-1',
      email: 'test@example.com',
    });

    mockFindById.mockResolvedValue({
      id: 'account-1',
      contactEmail: 'test@example.com',
      name: 'Test Owner',
      type: 'individual',
      status: 'active',
      payoutProviderRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request
      .get('/api/owners/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.contactEmail).toBe('test@example.com');
  });

  it('returns 401 if no token provided', async () => {
    await request.get('/api/owners/me').expect(401);
  });

  it('returns 401 if token invalid', async () => {
    vi.mocked(verifyToken).mockReturnValue(null);

    await request
      .get('/api/owners/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('returns 404 if account not found', async () => {
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'account-1',
      email: 'test@example.com',
    });

    mockFindById.mockResolvedValue(null);

    await request
      .get('/api/owners/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);
  });
});
