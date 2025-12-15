import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '@/server';
import { AdminAuthService } from '@/services/AdminAuthService';
import { AdminService } from '@/services/AdminService';
import { setAdminAuthService, setAdminService } from '@/routes/admin';
import type { IAdminAccountReader, IAdminAccountWriter } from '@/repositories/IAdminAccountRepository';
import { AdminAccountRepository } from '@/repositories/implementations/AdminAccountRepository';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';

// Mock JWT verification for admin routes
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

describe('Admin Routes', () => {
  let adminAccountRepo: AdminAccountRepository;
  let adminAuthService: AdminAuthService;
  let adminService: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    adminAccountRepo = new AdminAccountRepository(prisma);
    adminAuthService = new AdminAuthService(adminAccountRepo, adminAccountRepo);
    // AdminService setup would require many dependencies - simplified for integration test
    setAdminAuthService(adminAuthService);
  });

  describe('POST /api/admin/login', () => {
    it('returns 200 with session token for valid credentials', async () => {
      // Create test admin account
      const passwordHash = await bcrypt.hash('password123', 10);
      const adminAccount = await prisma.adminAccount.create({
        data: {
          email: 'admin@test.com',
          passwordHash,
          role: 'support_admin',
          status: 'active',
        },
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

      // Cleanup
      await prisma.adminAccount.delete({ where: { id: adminAccount.id } });
    });

    it('returns 401 for invalid credentials', async () => {
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
