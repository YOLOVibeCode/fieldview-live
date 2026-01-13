/**
 * Tests for PasswordResetTokenRepository (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PasswordResetTokenRepository } from '../implementations/PasswordResetTokenRepository';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

describe('PasswordResetTokenRepository (TDD)', () => {
  const repo = new PasswordResetTokenRepository(prisma);

  // Helper: Generate a unique token hash
  const generateTokenHash = () => {
    return crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  };

  // Helper: Create a test user
  let testOwnerAccountId: string;
  let testOwnerUserId: string;
  let testAdminAccountId: string;

  beforeAll(async () => {
    // Create test owner account
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for Password Reset',
        status: 'active',
        contactEmail: 'test-password-reset@example.com',
      },
    });
    testOwnerAccountId = ownerAccount.id;

    // Create test owner user
    const ownerUser = await prisma.ownerUser.create({
      data: {
        ownerAccountId: testOwnerAccountId,
        email: 'owner-reset@example.com',
        passwordHash: 'dummy-hash',
        role: 'owner_admin',
      },
    });
    testOwnerUserId = ownerUser.id;

    // Create test admin account
    const adminAccount = await prisma.adminAccount.create({
      data: {
        email: 'admin-reset@example.com',
        passwordHash: 'dummy-hash',
        role: 'super_admin',
      },
    });
    testAdminAccountId = adminAccount.id;
  });

  afterEach(async () => {
    // Clean up tokens after each test
    await prisma.passwordResetToken.deleteMany({});
  });

  describe('Writer: create', () => {
    it('should create a new password reset token', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const token = await repo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      });

      expect(token).toBeDefined();
      expect(token.tokenHash).toBe(tokenHash);
      expect(token.userType).toBe('owner_user');
      expect(token.userId).toBe(testOwnerUserId);
      expect(token.usedAt).toBeNull();
    });

    it('should create a token for admin_account', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const token = await repo.create({
        tokenHash,
        userType: 'admin_account',
        userId: testAdminAccountId,
        email: 'admin-reset@example.com',
        expiresAt,
      });

      expect(token).toBeDefined();
      expect(token.userType).toBe('admin_account');
      expect(token.userId).toBe(testAdminAccountId);
    });
  });

  describe('Reader: findByTokenHash', () => {
    it('should find a token by hash', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await repo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt,
      });

      const found = await repo.findByTokenHash(tokenHash);

      expect(found).toBeDefined();
      expect(found?.tokenHash).toBe(tokenHash);
    });

    it('should return null for non-existent token', async () => {
      const found = await repo.findByTokenHash('non-existent-hash');
      expect(found).toBeNull();
    });
  });

  describe('Reader: findUnexpiredByEmail', () => {
    it('should find unexpired tokens for an email', async () => {
      const email = 'owner-reset@example.com';
      const tokenHash1 = generateTokenHash();
      const tokenHash2 = generateTokenHash();
      const expiredTokenHash = generateTokenHash();

      // Create two unexpired tokens
      await repo.create({
        tokenHash: tokenHash1,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      await repo.create({
        tokenHash: tokenHash2,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Create one expired token
      await repo.create({
        tokenHash: expiredTokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const unexpired = await repo.findUnexpiredByEmail(email, 'owner_user');

      expect(unexpired).toHaveLength(2);
      expect(unexpired.every((t) => t.expiresAt > new Date())).toBe(true);
    });
  });

  describe('Reader: countRecentByEmail', () => {
    it('should count recent token requests', async () => {
      const email = 'owner-reset@example.com';
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Create 3 tokens in the last hour
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tokenHash: generateTokenHash(),
          userType: 'owner_user',
          userId: testOwnerUserId,
          email,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      const count = await repo.countRecentByEmail(email, 'owner_user', oneHourAgo);

      expect(count).toBe(3);
    });
  });

  describe('Writer: markAsUsed', () => {
    it('should mark a token as used', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const token = await repo.create({
        tokenHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt,
      });

      await repo.markAsUsed(token.id);

      const updated = await repo.findByTokenHash(tokenHash);

      expect(updated?.usedAt).not.toBeNull();
      expect(updated?.usedAt).toBeInstanceOf(Date);
    });
  });

  describe('Writer: invalidateAllForUser', () => {
    it('should mark all tokens for a user as used', async () => {
      const email = 'owner-reset@example.com';

      // Create 3 tokens for the user
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tokenHash: generateTokenHash(),
          userType: 'owner_user',
          userId: testOwnerUserId,
          email,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      const count = await repo.invalidateAllForUser(testOwnerUserId, 'owner_user');

      expect(count).toBe(3);

      // Verify all are marked as used
      const tokens = await repo.findByUserId(testOwnerUserId, 'owner_user');
      expect(tokens.every((t) => t.usedAt !== null)).toBe(true);
    });
  });

  describe('Writer: deleteExpired', () => {
    it('should delete only expired tokens', async () => {
      // Create 2 expired tokens
      await repo.create({
        tokenHash: generateTokenHash(),
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt: new Date(Date.now() - 1000),
      });

      await repo.create({
        tokenHash: generateTokenHash(),
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt: new Date(Date.now() - 2000),
      });

      // Create 1 unexpired token
      const unexpiredHash = generateTokenHash();
      await repo.create({
        tokenHash: unexpiredHash,
        userType: 'owner_user',
        userId: testOwnerUserId,
        email: 'owner-reset@example.com',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const deletedCount = await repo.deleteExpired();

      expect(deletedCount).toBe(2);

      // Verify unexpired token still exists
      const remaining = await repo.findByTokenHash(unexpiredHash);
      expect(remaining).not.toBeNull();
    });
  });
});

