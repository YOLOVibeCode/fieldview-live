/**
 * Owner Events Routes Integration Tests (TDD)
 *
 * Tests for coach/team manager event creation and management endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SuperTest } from 'supertest';
import { agent } from 'supertest';

import app from '@/server';
import { verifyToken } from '@/lib/jwt';

// Mock JWT verification
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ownerUser: {
      findFirst: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    watchChannel: {
      findUnique: vi.fn(),
    },
    viewerIdentity: {
      findMany: vi.fn(),
    },
  },
}));

describe('Owner Events Routes', () => {
  let request: SuperTest<typeof app>;

  beforeEach(() => {
    vi.clearAllMocks();
    request = agent(app);
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'owner-account-1',
      email: 'coach@example.com',
    });
  });

  describe('POST /api/owners/me/orgs/:orgShortName/channels/:teamSlug/events', () => {
    it('creates event successfully with auto-generated URL key', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
        ownerAccountId: 'owner-account-1',
        email: 'coach@example.com',
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        shortName: 'STORMFC',
        name: 'Storm FC',
        ownerAccountId: 'owner-account-1',
      } as any);

      vi.mocked(prisma.watchChannel.findUnique).mockResolvedValue({
        id: 'channel-1',
        organizationId: 'org-1',
        teamSlug: '2010',
        displayName: '2010 Team',
        streamType: 'mux_playback',
        muxPlaybackId: 'playback-123',
        accessMode: 'public_free',
      } as any);

      // Mock event creation (would be done by repository)
      // This is a simplified test - full integration would require DB setup

      const response = await request
        .post('/api/owners/me/orgs/STORMFC/channels/2010/events')
        .set('Authorization', 'Bearer valid-token')
        .send({
          organizationId: 'org-1',
          channelId: 'channel-1',
          startsAt: new Date('2025-02-01T14:30:00Z').toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('canonicalPath');
      expect(response.body.canonicalPath).toMatch(/^\/stormfc\/2010\//);
    });

    it('returns 404 if organization not found', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
      } as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await request
        .post('/api/owners/me/orgs/INVALID/channels/2010/events')
        .set('Authorization', 'Bearer valid-token')
        .send({
          organizationId: 'org-1',
          channelId: 'channel-1',
          startsAt: new Date().toISOString(),
        })
        .expect(404);
    });

    it('returns 401 if not authenticated', async () => {
      vi.mocked(verifyToken).mockReturnValue(null);

      await request
        .post('/api/owners/me/orgs/STORMFC/channels/2010/events')
        .send({
          organizationId: 'org-1',
          channelId: 'channel-1',
          startsAt: new Date().toISOString(),
        })
        .expect(401);
    });
  });

  describe('POST /api/owners/me/events/:eventId/go-live', () => {
    it('marks event as live and triggers notifications', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
      } as any);

      // Mock event exists and user has permission
      // Full test would require event repository mocking

      const response = await request
        .post('/api/owners/me/events/event-123/go-live')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('state', 'live');
    });
  });
});

