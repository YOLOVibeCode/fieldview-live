/**
 * Integration Tests for Password Reset API Routes (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { passwordResetRoutes } from '../../routes/auth.password-reset';
import crypto from 'crypto';

describe('Password Reset API Routes (Integration)', () => {
  let app: express.Application;
  let testOwnerEmail: string;
  let testOwnerUserId: string;
  let testAdminEmail: string;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/auth/password-reset', passwordResetRoutes);
    // Add error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err.name === 'ZodError' || err.statusCode === 400) {
        return res.status(400).json({
          error: err.message || 'Validation error',
          details: err.issues || err.details,
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    });

    // Create test owner account and user
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for API',
        status: 'active',
        contactEmail: 'api-test@example.com',
      },
    });

    testOwnerEmail = `api-owner-${Date.now()}@example.com`;
    const ownerUser = await prisma.ownerUser.create({
      data: {
        ownerAccountId: ownerAccount.id,
        email: testOwnerEmail,
        passwordHash: await hashPassword('OldPassword123!'),
        role: 'owner_admin',
      },
    });
    testOwnerUserId = ownerUser.id;

    // Create test admin account
    testAdminEmail = `api-admin-${Date.now()}@example.com`;
    await prisma.adminAccount.create({
      data: {
        email: testAdminEmail,
        passwordHash: await hashPassword('OldAdminPass123!'),
        role: 'super_admin',
      },
    });
  });

  afterEach(async () => {
    // Clean up tokens after each test
    await prisma.passwordResetToken.deleteMany({});
  });

  describe('POST /api/auth/password-reset/request', () => {
    it('should accept valid password reset request for owner_user', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testOwnerEmail,
          userType: 'owner_user',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('email');
    });

    it('should accept valid password reset request for admin_account', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testAdminEmail,
          userType: 'admin_account',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: 'invalid-email',
          userType: 'owner_user',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing userType', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testOwnerEmail,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid userType', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testOwnerEmail,
          userType: 'invalid_type',
        });

      expect(response.status).toBe(400);
    });

    it('should enforce rate limiting', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/password-reset/request')
          .send({
            email: testOwnerEmail,
            userType: 'owner_user',
          });
      }

      // 4th request should fail
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({
          email: testOwnerEmail,
          userType: 'owner_user',
        });

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/password-reset/verify/:token', () => {
    it('should verify a valid token', async () => {
      // Create a token first
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await request(app).get(
        `/api/auth/password-reset/verify/${rawToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.email).toBe(testOwnerEmail);
    });

    it('should reject an invalid token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const response = await request(app).get(
        `/api/auth/password-reset/verify/${fakeToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject an expired token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      const response = await request(app).get(
        `/api/auth/password-reset/verify/${rawToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    it('should successfully reset password with valid token', async () => {
      // Create a token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: rawToken,
          newPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('success');

      // Verify password was changed
      const user = await prisma.ownerUser.findUnique({
        where: { id: testOwnerUserId },
      });
      expect(user?.passwordResetCount).toBe(1);
      expect(user?.lastPasswordResetAt).not.toBeNull();
    });

    it('should return 400 for weak password', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: rawToken,
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: fakeToken,
          newPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({
          token: 'some-token',
        });

      expect(response.status).toBe(400);
    });
  });
});

