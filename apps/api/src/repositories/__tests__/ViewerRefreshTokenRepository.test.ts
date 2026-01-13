/**
 * Tests for ViewerRefreshTokenRepository (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ViewerRefreshTokenRepository } from '../implementations/ViewerRefreshTokenRepository';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

describe('ViewerRefreshTokenRepository (TDD)', () => {
  const repo = new ViewerRefreshTokenRepository(prisma);

  // Helper: Generate a unique token hash
  const generateTokenHash = () => {
    return crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  };

  // Test viewer
  let testViewerIdentityId: string;
  let testViewerEmail: string;
  let testDirectStreamId: string;

  beforeAll(async () => {
    // Create test viewer identity
    testViewerEmail = `viewer-refresh-${Date.now()}@example.com`;
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: testViewerEmail,
        emailVerifiedAt: new Date(),
      },
    });
    testViewerIdentityId = viewer.id;

    // Create test direct stream
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for Viewer Refresh',
        status: 'active',
        contactEmail: 'refresh-owner@example.com',
      },
    });

    const stream = await prisma.directStream.create({
      data: {
        slug: `test-refresh-${Date.now()}`,
        title: 'Test Stream for Refresh',
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

  describe('Writer: create', () => {
    it('should create a new viewer refresh token', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const token = await repo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        directStreamId: testDirectStreamId,
        expiresAt,
        redirectUrl: '/direct/test-stream',
      });

      expect(token).toBeDefined();
      expect(token.tokenHash).toBe(tokenHash);
      expect(token.viewerIdentityId).toBe(testViewerIdentityId);
      expect(token.directStreamId).toBe(testDirectStreamId);
      expect(token.usedAt).toBeNull();
    });

    it('should create a token without directStreamId', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const token = await repo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt,
      });

      expect(token).toBeDefined();
      expect(token.directStreamId).toBeNull();
    });
  });

  describe('Reader: findByTokenHash', () => {
    it('should find a token by hash', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await repo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
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

  describe('Reader: findUnexpiredByViewerId', () => {
    it('should find unexpired tokens for a viewer', async () => {
      const tokenHash1 = generateTokenHash();
      const tokenHash2 = generateTokenHash();
      const expiredTokenHash = generateTokenHash();

      // Create two unexpired tokens
      await repo.create({
        tokenHash: tokenHash1,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      await repo.create({
        tokenHash: tokenHash2,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Create one expired token
      await repo.create({
        tokenHash: expiredTokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const unexpired = await repo.findUnexpiredByViewerId(testViewerIdentityId);

      expect(unexpired).toHaveLength(2);
      expect(unexpired.every((t) => t.expiresAt > new Date())).toBe(true);
    });
  });

  describe('Reader: countRecentByEmail', () => {
    it('should count recent token requests', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Create 3 tokens in the last hour
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tokenHash: generateTokenHash(),
          viewerIdentityId: testViewerIdentityId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      const count = await repo.countRecentByEmail(testViewerEmail, oneHourAgo);

      expect(count).toBe(3);
    });
  });

  describe('Writer: markAsUsed', () => {
    it('should mark a token as used', async () => {
      const tokenHash = generateTokenHash();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const token = await repo.create({
        tokenHash,
        viewerIdentityId: testViewerIdentityId,
        expiresAt,
      });

      await repo.markAsUsed(token.id);

      const updated = await repo.findByTokenHash(tokenHash);

      expect(updated?.usedAt).not.toBeNull();
      expect(updated?.usedAt).toBeInstanceOf(Date);
    });
  });

  describe('Writer: invalidateAllForViewer', () => {
    it('should mark all tokens for a viewer as used', async () => {
      // Create 3 tokens for the viewer
      for (let i = 0; i < 3; i++) {
        await repo.create({
          tokenHash: generateTokenHash(),
          viewerIdentityId: testViewerIdentityId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      const count = await repo.invalidateAllForViewer(testViewerIdentityId);

      expect(count).toBe(3);

      // Verify all are marked as used
      const tokens = await repo.findUnexpiredByViewerId(testViewerIdentityId);
      expect(tokens.every((t) => t.usedAt !== null)).toBe(true);
    });
  });

  describe('Writer: deleteExpired', () => {
    it('should delete only expired tokens', async () => {
      // Create 2 expired tokens
      await repo.create({
        tokenHash: generateTokenHash(),
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() - 1000),
      });

      await repo.create({
        tokenHash: generateTokenHash(),
        viewerIdentityId: testViewerIdentityId,
        expiresAt: new Date(Date.now() - 2000),
      });

      // Create 1 unexpired token
      const unexpiredHash = generateTokenHash();
      await repo.create({
        tokenHash: unexpiredHash,
        viewerIdentityId: testViewerIdentityId,
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

