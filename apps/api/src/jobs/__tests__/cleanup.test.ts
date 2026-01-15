/**
 * Cleanup Job Tests
 * 
 * Tests for automatic game and clip cleanup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../config/database';
import { cleanupExpiredGames, cleanupExpiredClips } from '../cleanup';

describe('Cleanup Jobs', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.videoClip.deleteMany();
    await prisma.videoBookmark.deleteMany();
    await prisma.game.deleteMany();
    await prisma.directStream.deleteMany();
    await prisma.ownerAccount.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.videoClip.deleteMany();
    await prisma.videoBookmark.deleteMany();
    await prisma.game.deleteMany();
    await prisma.directStream.deleteMany();
    await prisma.ownerAccount.deleteMany();
  });

  describe('cleanupExpiredGames', () => {
    it('should delete games older than 14 days with cascade', async () => {
      // Create test account
      const account = await prisma.ownerAccount.create({
        data: {
          email: 'test@example.com',
          hashedPassword: 'hash',
          role: 'owner',
          isActive: true,
        },
      });

      // Create old game (15 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);

      const oldGame = await prisma.game.create({
        data: {
          ownerAccountId: account.id,
          awayTeam: 'Away Team',
          homeTeam: 'Home Team',
          awayScore: 0,
          homeScore: 0,
          sport: 'soccer',
          startTime: oldDate,
          completedAt: oldDate,
        },
      });

      // Create clips and bookmarks for old game
      const viewerIdentity = await prisma.viewerIdentity.create({
        data: {
          email: 'viewer@example.com',
          name: 'Test Viewer',
        },
      });

      await prisma.videoClip.create({
        data: {
          gameId: oldGame.id,
          providerName: 'mock',
          providerClipId: 'clip-1',
          title: 'Old Clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          status: 'ready',
        },
      });

      await prisma.videoBookmark.create({
        data: {
          gameId: oldGame.id,
          viewerIdentityId: viewerIdentity.id,
          timestampSeconds: 100,
          label: 'Old Bookmark',
        },
      });

      // Create recent game (5 days ago)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const recentGame = await prisma.game.create({
        data: {
          ownerAccountId: account.id,
          awayTeam: 'Away Team 2',
          homeTeam: 'Home Team 2',
          awayScore: 0,
          homeScore: 0,
          sport: 'soccer',
          startTime: recentDate,
          completedAt: recentDate,
        },
      });

      // Run cleanup
      const result = await cleanupExpiredGames();

      // Verify old game deleted
      expect(result.gamesDeleted).toBe(1);
      expect(result.clipsDeleted).toBe(1);
      expect(result.bookmarksDeleted).toBe(1);

      const oldGameExists = await prisma.game.findUnique({
        where: { id: oldGame.id },
      });
      expect(oldGameExists).toBeNull();

      const oldClipExists = await prisma.videoClip.count({
        where: { gameId: oldGame.id },
      });
      expect(oldClipExists).toBe(0);

      const oldBookmarkExists = await prisma.videoBookmark.count({
        where: { gameId: oldGame.id },
      });
      expect(oldBookmarkExists).toBe(0);

      // Verify recent game still exists
      const recentGameExists = await prisma.game.findUnique({
        where: { id: recentGame.id },
      });
      expect(recentGameExists).not.toBeNull();
    });

    it('should handle no expired games', async () => {
      const result = await cleanupExpiredGames();

      expect(result.gamesDeleted).toBe(0);
      expect(result.clipsDeleted).toBe(0);
      expect(result.bookmarksDeleted).toBe(0);
    });

    it('should only delete completed games', async () => {
      const account = await prisma.ownerAccount.create({
        data: {
          email: 'test2@example.com',
          hashedPassword: 'hash',
          role: 'owner',
          isActive: true,
        },
      });

      // Create old game but not completed
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);

      const oldGame = await prisma.game.create({
        data: {
          ownerAccountId: account.id,
          awayTeam: 'Away Team',
          homeTeam: 'Home Team',
          awayScore: 0,
          homeScore: 0,
          sport: 'soccer',
          startTime: oldDate,
          // completedAt is null - game not completed
        },
      });

      const result = await cleanupExpiredGames();

      // Should not delete incomplete game
      expect(result.gamesDeleted).toBe(0);

      const gameExists = await prisma.game.findUnique({
        where: { id: oldGame.id },
      });
      expect(gameExists).not.toBeNull();
    });
  });

  describe('cleanupExpiredClips', () => {
    it('should delete clips past their expiresAt date', async () => {
      // Create clip with past expiration
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await prisma.videoClip.create({
        data: {
          providerName: 'mock',
          providerClipId: 'expired-clip',
          title: 'Expired Clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          status: 'ready',
          expiresAt: pastDate,
        },
      });

      // Create clip with future expiration
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await prisma.videoClip.create({
        data: {
          providerName: 'mock',
          providerClipId: 'valid-clip',
          title: 'Valid Clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          status: 'ready',
          expiresAt: futureDate,
        },
      });

      const result = await cleanupExpiredClips();

      expect(result).toBe(1);

      const totalClips = await prisma.videoClip.count();
      expect(totalClips).toBe(1);

      const validClip = await prisma.videoClip.findFirst({
        where: { providerClipId: 'valid-clip' },
      });
      expect(validClip).not.toBeNull();
    });

    it('should handle no expired clips', async () => {
      const result = await cleanupExpiredClips();
      expect(result).toBe(0);
    });

    it('should not delete clips with no expiration', async () => {
      await prisma.videoClip.create({
        data: {
          providerName: 'mock',
          providerClipId: 'permanent-clip',
          title: 'Permanent Clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          status: 'ready',
          // expiresAt is null - no expiration
        },
      });

      const result = await cleanupExpiredClips();

      expect(result).toBe(0);

      const clip = await prisma.videoClip.findFirst({
        where: { providerClipId: 'permanent-clip' },
      });
      expect(clip).not.toBeNull();
    });
  });
});

