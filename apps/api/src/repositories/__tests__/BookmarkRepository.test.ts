/**
 * BookmarkRepository Tests (TDD)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { BookmarkRepository } from '../BookmarkRepository';
import type { CreateBookmarkInput } from '../interfaces/IBookmarkRepository';

const prisma = new PrismaClient();
const bookmarkRepo = new BookmarkRepository(prisma);

describe('BookmarkRepository (TDD)', () => {
  let testViewerId: string;
  let testGameId: string;

  beforeEach(async () => {
    // Create test viewer
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: `test-${Date.now()}@example.com`,
      },
    });
    testViewerId = viewer.id;

    // Create test owner for game
    const owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner',
        status: 'active',
        contactEmail: 'owner@test.com',
      },
    });

    // Create test game
    const game = await prisma.game.create({
      data: {
        ownerAccountId: owner.id,
        title: 'Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(),
        priceCents: 499,
        keywordCode: `TEST${Date.now()}`,
        qrUrl: 'https://example.com/qr',
      },
    });
    testGameId = game.id;
  });

  afterEach(async () => {
    // Clean up in dependency order
    await prisma.videoBookmark.deleteMany();
    await prisma.videoClip.deleteMany();
    if (testGameId) {
      await prisma.game.delete({ where: { id: testGameId } }).catch(() => {});
    }
    if (testViewerId) {
      await prisma.viewerIdentity.delete({ where: { id: testViewerId } }).catch(() => {});
    }
    // Delete all test owner accounts (has FK from many tables, so skip)
    await prisma.ownerAccount.deleteMany({
      where: {
        contactEmail: 'owner@test.com',
      },
    }).catch(() => {});
  });

  describe('IBookmarkWriter', () => {
    it('should create a bookmark', async () => {
      const input: CreateBookmarkInput = {
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Great Goal!',
        notes: 'Amazing shot from midfield',
      };

      const bookmark = await bookmarkRepo.create(input);

      expect(bookmark.id).toBeDefined();
      expect(bookmark.gameId).toBe(testGameId);
      expect(bookmark.viewerIdentityId).toBe(testViewerId);
      expect(bookmark.timestampSeconds).toBe(120);
      expect(bookmark.label).toBe('Great Goal!');
      expect(bookmark.notes).toBe('Amazing shot from midfield');
      expect(bookmark.isShared).toBe(false); // Default
    });

    it('should update a bookmark', async () => {
      const bookmark = await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Original Label',
      });

      const updated = await bookmarkRepo.update(bookmark.id, {
        label: 'Updated Label',
        notes: 'New notes',
        isShared: true,
      });

      expect(updated.label).toBe('Updated Label');
      expect(updated.notes).toBe('New notes');
      expect(updated.isShared).toBe(true);
    });

    it('should delete a bookmark', async () => {
      const bookmark = await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'To Delete',
      });

      await bookmarkRepo.delete(bookmark.id);

      const deleted = await bookmarkRepo.getById(bookmark.id);
      expect(deleted).toBeNull();
    });

    it('should link bookmark to clip', async () => {
      const bookmark = await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Clip Me',
      });

      // Create a clip
      const clip = await prisma.videoClip.create({
        data: {
          gameId: testGameId,
          providerName: 'mock',
          providerClipId: 'mock-clip-for-bookmark',
          title: 'Test Clip',
          startTimeSeconds: 110,
          endTimeSeconds: 130,
          durationSeconds: 20,
          status: 'ready',
        },
      });

      const linked = await bookmarkRepo.linkToClip(bookmark.id, clip.id);

      expect(linked.clipId).toBe(clip.id);
    });

    it('should delete all bookmarks by viewer', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Bookmark 1',
      });

      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 180,
        label: 'Bookmark 2',
      });

      const deletedCount = await bookmarkRepo.deleteByViewer(testViewerId);

      expect(deletedCount).toBe(2);
      const remaining = await bookmarkRepo.listByViewer(testViewerId);
      expect(remaining.length).toBe(0);
    });
  });

  describe('IBookmarkReader', () => {
    it('should get bookmark by ID', async () => {
      const created = await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Get Test',
      });

      const bookmark = await bookmarkRepo.getById(created.id);

      expect(bookmark).not.toBeNull();
      expect(bookmark?.id).toBe(created.id);
      expect(bookmark?.label).toBe('Get Test');
    });

    it('should return null for non-existent bookmark', async () => {
      const bookmark = await bookmarkRepo.getById('00000000-0000-0000-0000-000000000000');
      expect(bookmark).toBeNull();
    });

    it('should list bookmarks by viewer', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Viewer Bookmark 1',
      });

      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 180,
        label: 'Viewer Bookmark 2',
      });

      const bookmarks = await bookmarkRepo.listByViewer(testViewerId);

      expect(bookmarks.length).toBe(2);
    });

    it('should list bookmarks by game', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Game Bookmark',
      });

      const bookmarks = await bookmarkRepo.listByGame(testGameId);

      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].label).toBe('Game Bookmark');
    });

    it('should list public bookmarks', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Public Bookmark',
        isShared: true,
      });

      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 180,
        label: 'Private Bookmark',
        isShared: false,
      });

      const publicBookmarks = await bookmarkRepo.listPublic();

      expect(publicBookmarks.length).toBe(1);
      expect(publicBookmarks[0].label).toBe('Public Bookmark');
    });

    it('should count bookmarks by viewer', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Count 1',
      });

      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 180,
        label: 'Count 2',
      });

      const count = await bookmarkRepo.countByViewer(testViewerId);
      expect(count).toBe(2);
    });

    it('should check if timestamp exists', async () => {
      await bookmarkRepo.create({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Exists Test',
      });

      const exists = await bookmarkRepo.existsForTimestamp(testViewerId, testGameId, 120);
      expect(exists).toBe(true);

      const notExists = await bookmarkRepo.existsForTimestamp(testViewerId, testGameId, 999);
      expect(notExists).toBe(false);
    });

    it('should list bookmarks with pagination', async () => {
      for (let i = 1; i <= 5; i++) {
        await bookmarkRepo.create({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: i * 60,
          label: `Bookmark ${i}`,
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const page1 = await bookmarkRepo.listByViewer(testViewerId, { limit: 2, offset: 0 });
      expect(page1.length).toBe(2);

      const page2 = await bookmarkRepo.listByViewer(testViewerId, { limit: 2, offset: 2 });
      expect(page2.length).toBe(2);
    });
  });
});

