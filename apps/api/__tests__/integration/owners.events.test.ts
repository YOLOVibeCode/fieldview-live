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
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    watchChannel: {
      findUnique: vi.fn(),
    },
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
    viewerIdentity: {
      findMany: vi.fn(),
    },
  },
}));

// Mock NotificationService
vi.mock('@/services/NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue(undefined),
    sendSms: vi.fn().mockResolvedValue(undefined),
    notifyEventLive: vi.fn().mockResolvedValue(undefined),
  })),
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

      const orgId = '00000000-0000-0000-0000-000000000001';
      const channelId = '00000000-0000-0000-0000-000000000002';

      // Mock getOrganizationByShortName (first call in route)
      // Then getOrganizationById (called by CoachEventService)
      vi.mocked(prisma.organization.findUnique)
        .mockResolvedValueOnce({
          id: orgId,
          shortName: 'STORMFC',
          name: 'Storm FC',
          ownerAccountId: 'owner-account-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any) // First: getOrganizationByShortName
        .mockResolvedValueOnce({
          id: orgId,
          shortName: 'STORMFC',
          name: 'Storm FC',
          ownerAccountId: 'owner-account-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any); // Second: getOrganizationById in CoachEventService

      // Mock WatchLinkRepository.getChannelByOrgIdAndTeamSlug (uses findUnique with composite key)
      // This will be called by CoachEventService.getChannelById
      vi.mocked(prisma.watchChannel.findUnique)
        .mockResolvedValueOnce({
          id: channelId,
          organizationId: orgId,
          teamSlug: '2010',
          displayName: '2010 Team',
          streamType: 'mux_playback',
          muxPlaybackId: 'playback-123',
          accessMode: 'public_free',
          linkPreset: 'preset_c',
          priceCents: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any) // First call: getChannelByOrgIdAndTeamSlug
        .mockResolvedValueOnce({
          id: channelId,
          organizationId: orgId,
          teamSlug: '2010',
          displayName: '2010 Team',
          streamType: 'mux_playback',
          muxPlaybackId: 'playback-123',
          accessMode: 'public_free',
          linkPreset: 'preset_c',
          priceCents: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any); // Second call: getChannelById in CoachEventService

      // Mock organizationMember for authorization check (must be org_admin or team_manager)
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'membership-1',
        ownerUserId: 'owner-user-1',
        organizationId: orgId,
        role: 'org_admin', // Changed from 'coach' to 'org_admin' for authorization
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock event.count for unique key check
      vi.mocked(prisma.event.count).mockResolvedValue(0);

      // Mock event creation
      vi.mocked(prisma.event.create).mockResolvedValue({
        id: 'event-123',
        organizationId: orgId,
        channelId: channelId,
        startsAt: new Date('2025-02-01T14:30:00Z'),
        urlKey: '202502011430',
        canonicalPath: '/STORMFC/2010/202502011430',
        state: 'scheduled',
        streamType: null,
        muxPlaybackId: null,
        hlsManifestUrl: null,
        externalEmbedUrl: null,
        externalProvider: null,
        accessMode: null,
        priceCents: null,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelledAt: null,
        wentLiveAt: null,
        endedAt: null,
      } as any);

      const response = await request
        .post('/api/owners/me/orgs/STORMFC/channels/2010/events')
        .set('Authorization', 'Bearer valid-token')
        .send({
          organizationId: orgId,
          channelId: channelId,
          startsAt: new Date('2025-02-01T14:30:00Z').toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('canonicalPath');
      expect(response.body.canonicalPath).toMatch(/^\/STORMFC\/2010\//i);
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
          organizationId: '00000000-0000-0000-0000-000000000001',
          channelId: '00000000-0000-0000-0000-000000000002',
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
        ownerAccountId: 'owner-account-1',
      } as any);

      // Mock event lookup (called multiple times: authorization check, notification, response)
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce({
          id: 'event-123',
          organizationId: 'org-1',
          channelId: 'channel-1',
          state: 'scheduled',
          canonicalPath: '/STORMFC/2010/202502011430',
          accessMode: 'public_free',
          priceCents: null,
          startsAt: new Date(),
          urlKey: '202502011430',
          streamType: null,
          muxPlaybackId: null,
          hlsManifestUrl: null,
          externalEmbedUrl: null,
          externalProvider: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          wentLiveAt: null,
          endedAt: null,
        } as any) // First: authorization check
        .mockResolvedValueOnce({
          id: 'event-123',
          organizationId: 'org-1',
          channelId: 'channel-1',
          state: 'scheduled',
          canonicalPath: '/STORMFC/2010/202502011430',
          accessMode: 'public_free',
          priceCents: null,
          startsAt: new Date(),
          urlKey: '202502011430',
          streamType: null,
          muxPlaybackId: null,
          hlsManifestUrl: null,
          externalEmbedUrl: null,
          externalProvider: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          wentLiveAt: null,
          endedAt: null,
        } as any) // Second: notification function
        .mockResolvedValueOnce({
          id: 'event-123',
          organizationId: 'org-1',
          channelId: 'channel-1',
          state: 'live',
          canonicalPath: '/STORMFC/2010/202502011430',
          accessMode: 'public_free',
          priceCents: null,
          startsAt: new Date(),
          urlKey: '202502011430',
          streamType: null,
          muxPlaybackId: null,
          hlsManifestUrl: null,
          externalEmbedUrl: null,
          externalProvider: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          wentLiveAt: new Date(),
          endedAt: null,
        } as any); // Third: response

      // Mock authorization check
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'membership-1',
        ownerUserId: 'owner-user-1',
        organizationId: 'org-1',
        role: 'org_admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock notification dependencies
      vi.mocked(prisma.watchChannel.findUnique).mockResolvedValue({
        id: 'channel-1',
        teamSlug: '2010',
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        shortName: 'STORMFC',
      } as any);

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      // Mock event update (markEventLive)
      vi.mocked(prisma.event.update).mockResolvedValue({
        id: 'event-123',
        state: 'live',
        wentLiveAt: new Date(),
      } as any);

      const response = await request
        .post('/api/owners/me/events/event-123/go-live')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('state', 'live');
    });
  });
});

