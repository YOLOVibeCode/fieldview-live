/**
 * DVRService Tests (TDD)
 * 
 * Tests business logic orchestration between DVR providers and repositories
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DVRService } from '../DVRService';
import { ClipRepository } from '../../repositories/ClipRepository';
import { BookmarkRepository } from '../../repositories/BookmarkRepository';
import { MockDVRService } from '@fieldview/dvr-service';
import type { CreateClipFromRecordingInput, CreateBookmarkInput } from '../interfaces/IDVRService';

const prisma = new PrismaClient();
const clipRepo = new ClipRepository(prisma);
const bookmarkRepo = new BookmarkRepository(prisma);
const mockProvider = new MockDVRService();
const dvrService = new DVRService(mockProvider, clipRepo, bookmarkRepo);

describe('DVRService (TDD)', () => {
  let testViewerId: string;
  let testGameId: string;

  beforeEach(async () => {
    // Create test viewer
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: `test-dvr-${Date.now()}@example.com`,
      },
    });
    testViewerId = viewer.id;

    // Create test owner for game
    const owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'DVR Test Owner',
        status: 'active',
        contactEmail: `dvr-owner-${Date.now()}@test.com`,
      },
    });

    // Create test game
    const game = await prisma.game.create({
      data: {
        ownerAccountId: owner.id,
        title: 'DVR Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(),
        priceCents: 499,
        keywordCode: `DVRTEST${Date.now()}`,
        qrUrl: 'https://example.com/qr',
      },
    });
    testGameId = game.id;
  });

  afterEach(async () => {
    // Clean up
    await prisma.videoBookmark.deleteMany();
    await prisma.videoClip.deleteMany();
    if (testGameId) {
      await prisma.game.delete({ where: { id: testGameId } }).catch(() => {});
    }
    if (testViewerId) {
      await prisma.viewerIdentity.delete({ where: { id: testViewerId } }).catch(() => {});
    }
    await prisma.ownerAccount.deleteMany({
      where: {
        contactEmail: { contains: 'dvr-owner-' },
      },
    }).catch(() => {});
  });

  describe('Clip Operations', () => {
    it('should create clip from recording', async () => {
      const input: CreateClipFromRecordingInput = {
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-recording-123',
        title: 'Amazing Play',
        description: 'Goal of the century',
        startTimeSeconds: 120,
        endTimeSeconds: 150,
        isPublic: true,
        createdById: testViewerId,
        createdByType: 'viewer',
      };

      const clip = await dvrService.createClipFromRecording(input);

      expect(clip.id).toBeDefined();
      expect(clip.gameId).toBe(testGameId);
      expect(clip.providerName).toBe('mock');
      expect(clip.title).toBe('Amazing Play');
      expect(clip.durationSeconds).toBe(30);
      expect(clip.isPublic).toBe(true);
      expect(clip.status).toBe('ready');
      expect(clip.playbackUrl).toBeDefined();
    });

    it('should create clip from bookmark', async () => {
      // Create bookmark first
      const bookmark = await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Great Goal',
        notes: 'Amazing shot',
      });

      // Create clip from bookmark
      const clip = await dvrService.createClipFromBookmark({
        bookmarkId: bookmark.id,
        title: 'Goal Clip',
        bufferSeconds: 10,
        isPublic: true,
      });

      expect(clip.id).toBeDefined();
      expect(clip.gameId).toBe(testGameId);
      expect(clip.title).toBe('Goal Clip');
      expect(clip.startTimeSeconds).toBe(110); // 120 - 10
      expect(clip.endTimeSeconds).toBe(130); // 120 + 10
      expect(clip.durationSeconds).toBe(20);
      expect(clip.isPublic).toBe(true);

      // Verify bookmark is linked to clip
      const updatedBookmark = await dvrService.getBookmark(bookmark.id);
      expect(updatedBookmark?.clipId).toBe(clip.id);
    });

    it('should get clip by ID', async () => {
      const created = await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-get',
        title: 'Get Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
      });

      const clip = await dvrService.getClip(created.id);

      expect(clip).not.toBeNull();
      expect(clip?.id).toBe(created.id);
      expect(clip?.title).toBe('Get Test');
    });

    it('should list clips by game', async () => {
      await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-1',
        title: 'Clip 1',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        isPublic: true,
      });

      await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-2',
        title: 'Clip 2',
        startTimeSeconds: 30,
        endTimeSeconds: 60,
        isPublic: true,
      });

      const clips = await dvrService.listClips({ gameId: testGameId });

      expect(clips.length).toBe(2);
    });

    it('should list only public clips', async () => {
      await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-public',
        title: 'Public Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
        isPublic: true,
      });

      await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-private',
        title: 'Private Clip',
        startTimeSeconds: 30,
        endTimeSeconds: 60,
        isPublic: false,
      });

      const publicClips = await dvrService.listClips({ publicOnly: true });

      expect(publicClips.length).toBeGreaterThanOrEqual(1);
      expect(publicClips.every(c => c.isPublic)).toBe(true);
    });

    it('should track clip view', async () => {
      const clip = await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-views',
        title: 'View Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
      });

      await dvrService.trackClipView(clip.id);
      await dvrService.trackClipView(clip.id);

      const updated = await dvrService.getClip(clip.id);
      expect(updated?.viewCount).toBe(2);
    });

    it('should track clip share', async () => {
      const clip = await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-shares',
        title: 'Share Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
      });

      await dvrService.trackClipShare(clip.id);

      const updated = await dvrService.getClip(clip.id);
      expect(updated?.shareCount).toBe(1);
    });

    it('should delete clip', async () => {
      const clip = await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-delete',
        title: 'Delete Test',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
      });

      await dvrService.deleteClip(clip.id);

      const deleted = await dvrService.getClip(clip.id);
      expect(deleted).toBeNull();
    });

    it('should cleanup expired clips', async () => {
      // Create expired clip
      await dvrService.createClipFromRecording({
        gameId: testGameId,
        providerName: 'mock',
        recordingId: 'mock-rec-expired',
        title: 'Expired Clip',
        startTimeSeconds: 0,
        endTimeSeconds: 30,
      });

      // Manually set expiration in the past
      const clips = await prisma.videoClip.findMany();
      if (clips.length > 0) {
        await prisma.videoClip.update({
          where: { id: clips[0].id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      }

      const deletedCount = await dvrService.cleanupExpiredClips();
      expect(deletedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Bookmark Operations', () => {
    it('should create bookmark', async () => {
      const input: CreateBookmarkInput = {
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Great Goal',
        notes: 'Amazing shot from midfield',
        isShared: true,
      };

      const bookmark = await dvrService.createBookmark(input);

      expect(bookmark.id).toBeDefined();
      expect(bookmark.gameId).toBe(testGameId);
      expect(bookmark.viewerIdentityId).toBe(testViewerId);
      expect(bookmark.timestampSeconds).toBe(120);
      expect(bookmark.label).toBe('Great Goal');
      expect(bookmark.isShared).toBe(true);
    });

    it('should get bookmark by ID', async () => {
      const created = await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Get Test',
      });

      const bookmark = await dvrService.getBookmark(created.id);

      expect(bookmark).not.toBeNull();
      expect(bookmark?.id).toBe(created.id);
      expect(bookmark?.label).toBe('Get Test');
    });

    it('should list bookmarks by viewer', async () => {
      await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Bookmark 1',
      });

      await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 180,
        label: 'Bookmark 2',
      });

      const bookmarks = await dvrService.listBookmarks({ viewerId: testViewerId });

      expect(bookmarks.length).toBe(2);
    });

    it('should update bookmark', async () => {
      const bookmark = await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'Original',
      });

      const updated = await dvrService.updateBookmark(bookmark.id, {
        label: 'Updated Label',
        notes: 'New notes',
        isShared: true,
      });

      expect(updated.label).toBe('Updated Label');
      expect(updated.notes).toBe('New notes');
      expect(updated.isShared).toBe(true);
    });

    it('should delete bookmark', async () => {
      const bookmark = await dvrService.createBookmark({
        gameId: testGameId,
        viewerIdentityId: testViewerId,
        timestampSeconds: 120,
        label: 'To Delete',
      });

      await dvrService.deleteBookmark(bookmark.id);

      const deleted = await dvrService.getBookmark(bookmark.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Recording Operations', () => {
    it('should start recording', async () => {
      const result = await dvrService.startRecording('test-stream-key', {
        gameId: testGameId,
        title: 'Test Stream',
      });

      expect(result.recordingId).toBeDefined();
      expect(result.status).toBe('recording');
    });

    it('should stop recording', async () => {
      const { recordingId } = await dvrService.startRecording('test-stream-key');

      await dvrService.stopRecording(recordingId);

      const status = await dvrService.getRecordingStatus(recordingId);
      expect(status.status).toBe('completed');
    });

    it('should get recording status', async () => {
      const { recordingId } = await dvrService.startRecording('test-stream-key');

      const status = await dvrService.getRecordingStatus(recordingId);

      expect(status.status).toBe('recording');
      expect(status.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(status.sizeBytes).toBeGreaterThanOrEqual(0);
    });
  });
});

