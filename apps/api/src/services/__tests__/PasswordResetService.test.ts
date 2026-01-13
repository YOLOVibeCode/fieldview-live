/**
 * Tests for PasswordResetService (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PasswordResetService } from '../PasswordResetService';
import { PasswordResetTokenRepository } from '../../repositories/implementations/PasswordResetTokenRepository';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import crypto from 'crypto';

describe('PasswordResetService (TDD)', () => {
  const tokenRepo = new PasswordResetTokenRepository(prisma);
  const service = new PasswordResetService(tokenRepo, prisma);

  // Test users
  let testOwnerAccountId: string;
  let testOwnerUserId: string;
  let testOwnerEmail: string;
  let testAdminAccountId: string;
  let testAdminEmail: string;

  beforeAll(async () => {
    // Create test owner account
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for Password Reset Service',
        status: 'active',
        contactEmail: 'test-service@example.com',
      },
    });
    testOwnerAccountId = ownerAccount.id;

    // Create test owner user
    testOwnerEmail = `owner-service-${Date.now()}@example.com`;
    const ownerUser = await prisma.ownerUser.create({
      data: {
        ownerAccountId: testOwnerAccountId,
        email: testOwnerEmail,
        passwordHash: await hashPassword('OldPassword123!'),
        role: 'owner_admin',
      },
    });
    testOwnerUserId = ownerUser.id;

    // Create test admin account
    testAdminEmail = `admin-service-${Date.now()}@example.com`;
    const adminAccount = await prisma.adminAccount.create({
      data: {
        email: testAdminEmail,
        passwordHash: await hashPassword('OldAdminPass123!'),
        role: 'super_admin',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      },
    });
    testAdminAccountId = adminAccount.id;
  });

  afterEach(async () => {
    // Clean up tokens after each test
    await prisma.passwordResetToken.deleteMany({});
  });

  describe('requestReset()', () => {
    it('should return success for existing owner_user email', async () => {
      const result = await service.requestReset({
        email: testOwnerEmail,
        userType: 'owner_user',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('email');

      // Verify token was created
      const tokens = await tokenRepo.findUnexpiredByEmail(testOwnerEmail, 'owner_user');
      expect(tokens.length).toBe(1);
    });

    it('should return success for existing admin_account email', async () => {
      const result = await service.requestReset({
        email: testAdminEmail,
        userType: 'admin_account',
      });

      expect(result.success).toBe(true);

      // Verify token was created
      const tokens = await tokenRepo.findUnexpiredByEmail(testAdminEmail, 'admin_account');
      expect(tokens.length).toBe(1);
    });

    it('should return generic success for non-existent email (no enumeration)', async () => {
      const result = await service.requestReset({
        email: 'nonexistent@example.com',
        userType: 'owner_user',
      });

      // Should still return success to prevent email enumeration
      expect(result.success).toBe(true);

      // But no token should be created
      const tokens = await tokenRepo.findUnexpiredByEmail(
        'nonexistent@example.com',
        'owner_user'
      );
      expect(tokens.length).toBe(0);
    });

    it('should enforce rate limiting (max 3 requests per hour)', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await service.requestReset({
          email: testOwnerEmail,
          userType: 'owner_user',
        });
      }

      // 4th request should fail
      const result = await service.requestReset({
        email: testOwnerEmail,
        userType: 'owner_user',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many');
    });
  });

  describe('verifyToken()', () => {
    it('should verify a valid unexpired token', async () => {
      // Create a token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      const result = await service.verifyToken(rawToken);

      expect(result.valid).toBe(true);
      expect(result.email).toBe(testOwnerEmail);
      expect(result.userType).toBe('owner_user');
      expect(result.userId).toBe(testOwnerUserId);
    });

    it('should reject an expired token', async () => {
      // Create an expired token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const result = await service.verifyToken(rawToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject a used token', async () => {
      // Create a token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const token = await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Mark as used
      await tokenRepo.markAsUsed(token.id);

      const result = await service.verifyToken(rawToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('used');
    });

    it('should reject a non-existent token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const result = await service.verifyToken(fakeToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('confirmReset()', () => {
    it('should successfully reset password for owner_user', async () => {
      // Create a valid token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const newPassword = 'NewSecurePassword123!';

      const result = await service.confirmReset({
        token: rawToken,
        newPassword,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('success');

      // Verify password was changed
      const user = await prisma.ownerUser.findUnique({
        where: { id: testOwnerUserId },
      });

      expect(user?.passwordHash).not.toBe(await hashPassword('OldPassword123!'));

      // Verify token was marked as used
      const token = await tokenRepo.findByTokenHash(tokenHash);
      expect(token?.usedAt).not.toBeNull();

      // Verify lastPasswordResetAt was updated
      expect(user?.lastPasswordResetAt).not.toBeNull();
      expect(user?.passwordResetCount).toBe(1);
    });

    it('should successfully reset password for admin_account and require MFA reset', async () => {
      // Create a valid token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'admin_account',
        userId: testAdminAccountId,
        email: testAdminEmail,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes for admin
      });

      const newPassword = 'NewAdminPassword123!';

      const result = await service.confirmReset({
        token: rawToken,
        newPassword,
      });

      expect(result.success).toBe(true);

      // Verify password was changed
      const admin = await prisma.adminAccount.findUnique({
        where: { id: testAdminAccountId },
      });

      expect(admin?.passwordHash).not.toBe(await hashPassword('OldAdminPass123!'));

      // Verify MFA reset flag was set
      expect(admin?.mfaResetRequired).toBe(true);
      expect(admin?.passwordResetCount).toBe(1);
    });

    it('should reject reset with expired token', async () => {
      // Create an expired token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const result = await service.confirmReset({
        token: rawToken,
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject reset with weak password', async () => {
      // Create a valid token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const result = await service.confirmReset({
        token: rawToken,
        newPassword: 'weak', // Weak password
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password');
    });

    it('should invalidate all other tokens for user after successful reset', async () => {
      // Create 3 tokens for the same user
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await tokenRepo.create({
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        tokens.push(rawToken);
      }

      // Use the first token to reset password
      const firstToken = tokens[0];
      if (!firstToken) {
        throw new Error('Expected at least one token');
      }
      await service.confirmReset({
        token: firstToken,
        newPassword: 'NewPassword123!',
      });

      // Verify all tokens are now marked as used
      const userTokens = await tokenRepo.findByUserId(testOwnerUserId, 'owner_user');
      expect(userTokens.every((t) => t.usedAt !== null)).toBe(true);
    });
  });

  describe('cleanupExpiredTokens()', () => {
    it('should delete expired tokens', async () => {
      // Create 2 expired tokens
      for (let i = 0; i < 2; i++) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await tokenRepo.create({
          tokenHash,
          userType: 'owner_user',
          userId: testOwnerUserId,
          email: testOwnerEmail,
          expiresAt: new Date(Date.now() - 1000 * (i + 1)), // Expired
        });
      }

      // Create 1 unexpired token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await tokenRepo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: testOwnerEmail,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const deletedCount = await service.cleanupExpiredTokens();

      expect(deletedCount).toBe(2);

      // Verify unexpired token still exists
      const remaining = await tokenRepo.findByTokenHash(tokenHash);
      expect(remaining).not.toBeNull();
    });
  });
});

