/**
 * Owner DirectStreams Routes Integration Tests (TDD)
 *
 * Tests the API routes with mocked service layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agent } from 'supertest';
import app from '@/server';
import { verifyToken } from '@/lib/jwt';
import * as ownersDirectStreamsRoute from '@/routes/owners.direct-streams';
import type { DirectStream } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

function makeStreamResponse(overrides: Partial<DirectStream> = {}): DirectStream {
  return {
    id: overrides.id ?? 'stream-1',
    slug: overrides.slug ?? 'test-stream',
    title: overrides.title ?? 'Test Stream',
    ownerAccountId: overrides.ownerAccountId ?? 'owner-1',
    streamUrl: overrides.streamUrl ?? null,
    scheduledStartAt: overrides.scheduledStartAt ?? null,
    reminderSentAt: null,
    sendReminders: true,
    reminderMinutes: 5,
    paywallEnabled: overrides.paywallEnabled ?? false,
    priceInCents: overrides.priceInCents ?? 0,
    paywallMessage: null,
    allowSavePayment: false,
    adminPassword: 'hashed',
    chatEnabled: overrides.chatEnabled ?? true,
    scoreboardEnabled: overrides.scoreboardEnabled ?? false,
    allowViewerScoreEdit: false,
    allowViewerNameEdit: false,
    allowAnonymousChat: false,
    allowAnonymousScoreEdit: false,
    allowAnonymousView: true,
    requireEmailVerification: true,
    listed: true,
    scoreboardHomeTeam: null,
    scoreboardAwayTeam: null,
    scoreboardHomeColor: null,
    scoreboardAwayColor: null,
    welcomeMessage: null,
    status: 'active',
    archivedAt: null,
    deletedAt: null,
    autoPurgeAt: null,
    gameId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Owner DirectStreams Routes', () => {
  let request: ReturnType<typeof agent>;
  let mockService: {
    createStream: ReturnType<typeof vi.fn>;
    getStream: ReturnType<typeof vi.fn>;
    getStreamBySlug: ReturnType<typeof vi.fn>;
    listStreams: ReturnType<typeof vi.fn>;
    updateStream: ReturnType<typeof vi.fn>;
    archiveStream: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockService = {
      createStream: vi.fn(),
      getStream: vi.fn(),
      getStreamBySlug: vi.fn(),
      listStreams: vi.fn(),
      updateStream: vi.fn(),
      archiveStream: vi.fn(),
    };

    ownersDirectStreamsRoute.setOwnerDirectStreamService(mockService as any);
  });

  // ==================== AUTH ====================

  describe('Authentication', () => {
    it('returns 401 without auth header', async () => {
      await request.get('/api/owners/direct-streams').expect(401);
    });

    it('returns 401 with invalid token', async () => {
      vi.mocked(verifyToken).mockReturnValue(null);

      await request
        .get('/api/owners/direct-streams')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ==================== CREATE ====================

  describe('POST /api/owners/direct-streams', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });
    });

    it('creates a DirectStream', async () => {
      const created = makeStreamResponse({ slug: 'my-stream', title: 'My Stream' });
      mockService.createStream.mockResolvedValue(created);

      const response = await request
        .post('/api/owners/direct-streams')
        .set('Authorization', 'Bearer valid-token')
        .send({
          slug: 'my-stream',
          title: 'My Stream',
          adminPassword: 'securepassword123',
        })
        .expect(201);

      expect(response.body.stream.slug).toBe('my-stream');
      expect(response.body.stream.title).toBe('My Stream');
      expect(mockService.createStream).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({
          slug: 'my-stream',
          title: 'My Stream',
          adminPassword: 'securepassword123',
        })
      );
    });

    it('returns 400 for invalid slug', async () => {
      await request
        .post('/api/owners/direct-streams')
        .set('Authorization', 'Bearer valid-token')
        .send({
          slug: 'Invalid Slug!',
          title: 'Test',
          adminPassword: 'securepassword123',
        })
        .expect(400);
    });

    it('returns 400 for short admin password', async () => {
      await request
        .post('/api/owners/direct-streams')
        .set('Authorization', 'Bearer valid-token')
        .send({
          slug: 'my-stream',
          title: 'Test',
          adminPassword: 'short',
        })
        .expect(400);
    });

    it('returns 400 for missing required fields', async () => {
      await request
        .post('/api/owners/direct-streams')
        .set('Authorization', 'Bearer valid-token')
        .send({ slug: 'my-stream' })
        .expect(400);
    });
  });

  // ==================== LIST ====================

  describe('GET /api/owners/direct-streams', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });
    });

    it('lists streams for the owner', async () => {
      mockService.listStreams.mockResolvedValue([
        {
          id: 's1',
          slug: 'stream-1',
          title: 'Stream 1',
          status: 'active',
          eventsCount: 2,
          registrationsCount: 10,
          createdAt: new Date(),
        },
      ]);

      const response = await request
        .get('/api/owners/direct-streams')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.streams).toHaveLength(1);
      expect(response.body.streams[0].slug).toBe('stream-1');
      expect(mockService.listStreams).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({ status: 'active', sortBy: 'createdAt', sortOrder: 'desc' })
      );
    });

    it('passes status filter', async () => {
      mockService.listStreams.mockResolvedValue([]);

      await request
        .get('/api/owners/direct-streams?status=archived')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockService.listStreams).toHaveBeenCalledWith(
        'owner-1',
        expect.objectContaining({ status: 'archived', sortBy: 'createdAt', sortOrder: 'desc' })
      );
    });
  });

  // ==================== GET BY ID ====================

  describe('GET /api/owners/direct-streams/:id', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });
    });

    it('returns a stream by ID', async () => {
      const stream = makeStreamResponse({ id: 'stream-1', slug: 'my-stream' });
      mockService.getStream.mockResolvedValue(stream);

      const response = await request
        .get('/api/owners/direct-streams/stream-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.stream.id).toBe('stream-1');
      expect(mockService.getStream).toHaveBeenCalledWith('stream-1', 'owner-1');
    });

    it('returns 404 for nonexistent stream', async () => {
      mockService.getStream.mockResolvedValue(null);

      await request
        .get('/api/owners/direct-streams/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  // ==================== UPDATE ====================

  describe('PATCH /api/owners/direct-streams/:id', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });
    });

    it('updates an owned stream', async () => {
      const updated = makeStreamResponse({ id: 'stream-1', title: 'Updated Title' });
      mockService.updateStream.mockResolvedValue(updated);

      const response = await request
        .patch('/api/owners/direct-streams/stream-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.stream.title).toBe('Updated Title');
      expect(mockService.updateStream).toHaveBeenCalledWith(
        'stream-1',
        'owner-1',
        expect.objectContaining({ title: 'Updated Title' })
      );
    });
  });

  // ==================== ARCHIVE ====================

  describe('POST /api/owners/direct-streams/:id/archive', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockReturnValue({
        ownerAccountId: 'owner-1',
        email: 'test@example.com',
      });
    });

    it('archives an owned stream', async () => {
      const archived = { ...makeStreamResponse({ id: 'stream-1' }), status: 'archived' };
      mockService.archiveStream.mockResolvedValue(archived);

      const response = await request
        .post('/api/owners/direct-streams/stream-1/archive')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.stream.status).toBe('archived');
      expect(mockService.archiveStream).toHaveBeenCalledWith('stream-1', 'owner-1');
    });
  });
});
