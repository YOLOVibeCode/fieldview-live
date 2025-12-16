import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '@/server';
import { setAdminAuthService } from '@/routes/admin';
import { UnauthorizedError } from '@/lib/errors';

// Mock JWT verification for admin routes
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

// Mock Prisma (admin routes use repositories wired from prisma; tests inject services instead)
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Admin Routes', () => {
  let mockAdminAuthService: {
    login: ReturnType<typeof vi.fn>;
    setupMfa: ReturnType<typeof vi.fn>;
    verifyMfa: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdminAuthService = {
      login: vi.fn(),
      setupMfa: vi.fn(),
      verifyMfa: vi.fn(),
    };

    setAdminAuthService(mockAdminAuthService as any);
  });

  describe('POST /api/admin/login', () => {
    it('returns 200 with session token for valid credentials', async () => {
      mockAdminAuthService.login.mockResolvedValue({
        adminAccount: {
          id: 'admin-1',
          email: 'admin@test.com',
          role: 'support_admin',
        },
        sessionToken: 'admin_session_admin-1_123',
        mfaRequired: false,
      });

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.adminAccount).toBeDefined();
      expect(response.body.sessionToken).toBeTruthy();
      expect(response.body.mfaRequired).toBe(false);
    });

    it('returns 401 for invalid credentials', async () => {
      mockAdminAuthService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'invalid-email',
          password: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/search', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/admin/search?q=test');

      expect(response.status).toBe(401);
    });

    // Note: Full integration test would require setting up admin session
    // For now, we test the authentication requirement
  });

  describe('GET /api/admin/purchases/:purchaseId', () => {
    it('returns 401 without authentication', async () => {
      const response = await request(app).get('/api/admin/purchases/test-id');

      expect(response.status).toBe(401);
    });
  });
});
