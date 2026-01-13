/**
 * Tests for ViewerRefreshService (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ViewerRefreshService } from '../ViewerRefreshService';
import { ViewerRefreshTokenRepository } from '../../repositories/implementations/ViewerRefreshTokenRepository';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

describe('ViewerRefreshService (TDD)', () => {
  const tokenRepo = new ViewerRefreshTokenRepository(prisma);
  const service = new ViewerRefreshService(tokenRepo, prisma);

  // Test data
  let testViewerIdentityId: string;
  let testViewerEmail: string;
  let testDirectStreamId: string;

  beforeAll(async () => {
    // Create test viewer identity
    testViewerEmail = `viewer-service-${Date.now()}@example.com`;
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: testViewerEmail,
        emailVerifiedAt: new Date(),
        firstName: 'Test',
        lastName: 'Viewer',
      },
    });
    testViewerIdentityId = viewer.id;

    // Create test direct stream
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for Viewer Service',
        status: 'active',
        contactEmail: 'service-owner@example.com',
      },
    });

    const stream = await prisma.directStream.create({
      data: {
        slug: `test-service-${Date.now()}`,
        title: 'Test Stream for Service',
        ownerAccountId: ownerAccount.id,
        adminPassword: 'hashed-password',
      },
    });
    testDirectStreamId = stream.id;
  });

  afterEach(async () => {
    // Clean up tokens after each test
    await prisma.viewerRefreshToken.deleteMany({});
  });

  describe('requestRefresh()', () => {
    it('should return success for existing viewer email', async () => {
      const result = await service.requestRefresh({
        email: testViewerEmail,
        directStreamId: testDirectStreamId,
        redirectUrl: '/direct/test-stream',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('email');

      // Verify token was created
      const tokens = await tokenRepo.findUnexpiredByViewerId(testViewerIdentityId);
      expect(tokens.length).toBe(1);
    });

    it('should return success for non-existent email (no enumeration)', async () => {
      const result = await service.requestRefresh({
        email: 'nonexistent@example.com',
        directStreamId: testDirectStreamId,
      });

      // Should still return success to prevent email enumeration
      expect(result.success).toBe(true);

      // But no token should be created
      const allTokens = await prisma.viewerRefreshToken.findMany({});
      expect(allTokens.length).toBe(0);
    });

    it('should enforce rate limiting (max 3 requests per hour)', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await service.requestRefresh({
          email: testViewerEmail,
          directStreamId: testDirectStreamId,
        });
      }

      // 4th request should fail
      const result = await service.requestRefresh({
        email: testViewerEmail,
        directStreamId: testDirectStreamId,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many');
    });

    it('should handle request without directStreamId', async () => {
      const result = await service.requestRefresh({
        email: testViewerEmail,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('verifyAndRestoreAccess()', () => {
    it('should verify and restore access with valid token', async () => {
      // Create a token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        directStreamId: testDirectStreamId,
        redirectUrl: '/direct/test-stream',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const result = await service.verifyAndRestoreAccess(rawToken);

      expect(result.valid).toBe(true);
      expect(result.viewerIdentityId).toBe(testViewerIdentityId);
      expect(result.redirectUrl).toBe('/direct/test-stream');

      // Verify token was marked as used
      const token = await tokenRepo.findByTokenHash(tokenHash);
      expect(token?.usedAt).not.toBeNull();
    });

    it('should reject an expired token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const result = await service.verifyAndRestoreAccess(rawToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject a used token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const token = await tokenRepo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Mark as used
      await tokenRepo.markAsUsed(token.id);

      const result = await service.verifyAndRestoreAccess(rawToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('used');
    });

    it('should reject a non-existent token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const result = await service.verifyAndRestoreAccess(fakeToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should handle token without redirectUrl', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await tokenRepo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const result = await service.verifyAndRestoreAccess(rawToken);

      expect(result.valid).toBe(true);
      expect(result.redirectUrl).toBeUndefined();
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
          viewerIdentityId: testViewerIdentityId,
          expiresAt: new Date(Date.now() - 1000 * (i + 1)),
        });
      }

      // Create 1 unexpired token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await tokenRepo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
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

