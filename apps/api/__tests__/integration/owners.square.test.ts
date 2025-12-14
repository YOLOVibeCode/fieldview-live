import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { SquareService } from '@/services/SquareService';
import { verifyToken } from '@/lib/jwt';
import * as ownersSquareRoute from '@/routes/owners.square';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redisClient: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock Square SDK
vi.mock('square', () => ({
  Client: vi.fn().mockImplementation(() => ({
    oAuthApi: {
      obtainToken: vi.fn(),
    },
  })),
  Environment: {
    Production: 'production',
    Sandbox: 'sandbox',
  },
}));

describe('Square Connect Routes', () => {
  let request: SuperTest<typeof app>;
  let mockSquareService: {
    generateConnectUrl: ReturnType<typeof vi.fn>;
    handleConnectCallback: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockSquareService = {
      generateConnectUrl: vi.fn(),
      handleConnectCallback: vi.fn(),
    };

    // Set the mocked service
    ownersSquareRoute.setSquareService(mockSquareService as any);
  });

  describe('POST /api/owners/square/connect', () => {
    it('generates Square Connect URL for authenticated owner', async () => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'account-1',
        email: 'test@example.com',
      });

      mockSquareService.generateConnectUrl.mockResolvedValue({
        connectUrl: 'https://connect.squareup.com/oauth2/authorize?client_id=...',
        state: 'csrf-token-123',
      });

      const response = await request
        .post('/api/owners/square/connect')
        .set('Authorization', 'Bearer valid-token')
        .send({ returnUrl: 'http://localhost:3000/dashboard' })
        .expect(200);

      expect(response.body.connectUrl).toContain('connect.squareup.com');
      expect(response.body.state).toBeDefined();
    });

    it('returns 401 if not authenticated', async () => {
      await request
        .post('/api/owners/square/connect')
        .send({ returnUrl: 'http://localhost:3000/dashboard' })
        .expect(401);
    });
  });

  describe('GET /api/owners/square/callback', () => {
    it('handles Square callback and redirects', async () => {
      mockSquareService.handleConnectCallback.mockResolvedValue({
        merchantId: 'LSWR97SDRBXWK',
      });

      const response = await request
        .get('/api/owners/square/callback?code=auth-code&state=csrf-token')
        .expect(302);

      expect(response.headers.location).toContain('square_connected=true');
    });

    it('returns 400 if code or state missing', async () => {
      await request
        .get('/api/owners/square/callback')
        .expect(400);
    });
  });
});
