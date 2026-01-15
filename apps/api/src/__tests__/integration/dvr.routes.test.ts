/**
 * DVR API Routes Tests (TDD)
 * 
 * Integration tests for /api/clips, /api/bookmarks, /api/recordings
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../server';

const prisma = new PrismaClient();

describe('DVR API Routes (TDD)', () => {
  let testViewerId: string;
  let testGameId: string;
  let testToken: string;

  beforeAll(async () => {
    // Create test viewer
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: `dvr-api-test-${Date.now()}@example.com`,
      },
    });
    testViewerId = viewer.id;

    // Create test owner for game
    const owner = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'DVR API Test Owner',
        status: 'active',
        contactEmail: `dvr-api-owner-${Date.now()}@test.com`,
      },
    });

    // Create test game
    const game = await prisma.game.create({
      data: {
        ownerAccountId: owner.id,
        title: 'DVR API Test Game',
        homeTeam: 'Home',
        awayTeam: 'Away',
        startsAt: new Date(),
        priceCents: 499,
        keywordCode: `DVRAPI${Date.now()}`,
        qrUrl: 'https://example.com/qr',
      },
    });
    testGameId = game.id;

    // Mock auth token (in real app, generate JWT)
    testToken = 'test-auth-token';
  });

  afterEach(async () => {
    await prisma.videoBookmark.deleteMany();
    await prisma.videoClip.deleteMany();
  });

  describe('POST /api/clips', () => {
    it('should create a clip from recording', async () => {
      const response = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-recording-123',
          title: 'Test Clip',
          description: 'A test clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          isPublic: true,
        })
        .expect(201);

      expect(response.body.clip).toBeDefined();
      expect(response.body.clip.title).toBe('Test Clip');
      expect(response.body.clip.durationSeconds).toBe(30);
      expect(response.body.clip.status).toBe('ready');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/clips')
        .send({
          title: 'Missing Fields',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate time range', async () => {
      const response = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec',
          title: 'Invalid Range',
          startTimeSeconds: -5, // Invalid
          endTimeSeconds: 30,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/clips/from-bookmark', () => {
    it('should create clip from bookmark', async () => {
      // First create a bookmark
      const bookmarkRes = await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 120,
          label: 'Great Moment',
        })
        .expect(201);

      const bookmarkId = bookmarkRes.body.bookmark.id;

      // Then create clip from bookmark
      const response = await request(app)
        .post('/api/clips/from-bookmark')
        .send({
          bookmarkId,
          title: 'Clip from Bookmark',
          bufferSeconds: 10,
          isPublic: true,
        })
        .expect(201);

      expect(response.body.clip).toBeDefined();
      expect(response.body.clip.title).toBe('Clip from Bookmark');
      expect(response.body.clip.startTimeSeconds).toBe(110);
      expect(response.body.clip.endTimeSeconds).toBe(130);
    });
  });

  describe('GET /api/clips', () => {
    beforeEach(async () => {
      // Create test clips
      await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-1',
          title: 'Public Clip',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          isPublic: true,
        });

      await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-2',
          title: 'Private Clip',
          startTimeSeconds: 30,
          endTimeSeconds: 60,
          isPublic: false,
        });
    });

    it('should list clips by game', async () => {
      const response = await request(app)
        .get(`/api/clips?gameId=${testGameId}`)
        .expect(200);

      expect(response.body.clips).toBeDefined();
      expect(response.body.clips.length).toBeGreaterThanOrEqual(2);
    });

    it('should list only public clips', async () => {
      const response = await request(app)
        .get('/api/clips?publicOnly=true')
        .expect(200);

      expect(response.body.clips).toBeDefined();
      expect(response.body.clips.every((c: any) => c.isPublic)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/clips?limit=1&offset=0')
        .expect(200);

      expect(response.body.clips).toBeDefined();
      expect(response.body.clips.length).toBe(1);
    });
  });

  describe('GET /api/clips/:clipId', () => {
    it('should get clip by ID', async () => {
      const createRes = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-get',
          title: 'Get Test',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
        });

      const clipId = createRes.body.clip.id;

      const response = await request(app)
        .get(`/api/clips/${clipId}`)
        .expect(200);

      expect(response.body.clip).toBeDefined();
      expect(response.body.clip.id).toBe(clipId);
      expect(response.body.clip.title).toBe('Get Test');
    });

    it('should return 404 for non-existent clip', async () => {
      const response = await request(app)
        .get('/api/clips/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/clips/:clipId', () => {
    it('should delete clip', async () => {
      const createRes = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-delete',
          title: 'Delete Test',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
        });

      const clipId = createRes.body.clip.id;

      await request(app)
        .delete(`/api/clips/${clipId}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/clips/${clipId}`)
        .expect(404);
    });
  });

  describe('POST /api/clips/:clipId/view', () => {
    it('should track clip view', async () => {
      const createRes = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-view',
          title: 'View Test',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
        });

      const clipId = createRes.body.clip.id;

      await request(app)
        .post(`/api/clips/${clipId}/view`)
        .expect(200);

      // Verify view count
      const response = await request(app)
        .get(`/api/clips/${clipId}`)
        .expect(200);

      expect(response.body.clip.viewCount).toBe(1);
    });
  });

  describe('POST /api/clips/:clipId/share', () => {
    it('should track clip share', async () => {
      const createRes = await request(app)
        .post('/api/clips')
        .send({
          gameId: testGameId,
          providerName: 'mock',
          recordingId: 'test-rec-share',
          title: 'Share Test',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
        });

      const clipId = createRes.body.clip.id;

      await request(app)
        .post(`/api/clips/${clipId}/share`)
        .expect(200);

      // Verify share count
      const response = await request(app)
        .get(`/api/clips/${clipId}`)
        .expect(200);

      expect(response.body.clip.shareCount).toBe(1);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create bookmark', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 180,
          label: 'Amazing Goal',
          notes: 'Top corner shot',
          isShared: true,
        })
        .expect(201);

      expect(response.body.bookmark).toBeDefined();
      expect(response.body.bookmark.label).toBe('Amazing Goal');
      expect(response.body.bookmark.timestampSeconds).toBe(180);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .send({
          label: 'Missing Fields',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/bookmarks', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 120,
          label: 'Bookmark 1',
        });

      await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 240,
          label: 'Bookmark 2',
        });
    });

    it('should list bookmarks by viewer', async () => {
      const response = await request(app)
        .get(`/api/bookmarks?viewerId=${testViewerId}`)
        .expect(200);

      expect(response.body.bookmarks).toBeDefined();
      expect(response.body.bookmarks.length).toBe(2);
    });

    it('should list bookmarks by game', async () => {
      const response = await request(app)
        .get(`/api/bookmarks?gameId=${testGameId}`)
        .expect(200);

      expect(response.body.bookmarks).toBeDefined();
      expect(response.body.bookmarks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /api/bookmarks/:bookmarkId', () => {
    it('should update bookmark', async () => {
      const createRes = await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 300,
          label: 'Original Label',
        });

      const bookmarkId = createRes.body.bookmark.id;

      const response = await request(app)
        .patch(`/api/bookmarks/${bookmarkId}`)
        .send({
          label: 'Updated Label',
          notes: 'New notes',
          isShared: true,
        })
        .expect(200);

      expect(response.body.bookmark.label).toBe('Updated Label');
      expect(response.body.bookmark.notes).toBe('New notes');
      expect(response.body.bookmark.isShared).toBe(true);
    });
  });

  describe('DELETE /api/bookmarks/:bookmarkId', () => {
    it('should delete bookmark', async () => {
      const createRes = await request(app)
        .post('/api/bookmarks')
        .send({
          gameId: testGameId,
          viewerIdentityId: testViewerId,
          timestampSeconds: 360,
          label: 'To Delete',
        });

      const bookmarkId = createRes.body.bookmark.id;

      await request(app)
        .delete(`/api/bookmarks/${bookmarkId}`)
        .expect(204);
    });
  });

  describe('POST /api/recordings/start', () => {
    it('should start recording', async () => {
      const response = await request(app)
        .post('/api/recordings/start')
        .send({
          streamKey: 'test-stream-key',
          metadata: {
            gameId: testGameId,
            title: 'Test Stream',
          },
        })
        .expect(200);

      expect(response.body.recordingId).toBeDefined();
      expect(response.body.status).toBe('recording');
    });
  });

  describe('POST /api/recordings/:recordingId/stop', () => {
    it('should stop recording', async () => {
      const startRes = await request(app)
        .post('/api/recordings/start')
        .send({
          streamKey: 'test-stream-key-stop',
        });

      const recordingId = startRes.body.recordingId;

      await request(app)
        .post(`/api/recordings/${recordingId}/stop`)
        .expect(200);
    });
  });

  describe('GET /api/recordings/:recordingId/status', () => {
    it('should get recording status', async () => {
      const startRes = await request(app)
        .post('/api/recordings/start')
        .send({
          streamKey: 'test-stream-key-status',
        });

      const recordingId = startRes.body.recordingId;

      const response = await request(app)
        .get(`/api/recordings/${recordingId}/status`)
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.durationSeconds).toBeDefined();
      expect(response.body.sizeBytes).toBeDefined();
    });
  });
});

