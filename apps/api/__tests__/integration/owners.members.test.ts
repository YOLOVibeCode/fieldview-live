/**
 * Owner Members Routes Integration Tests (TDD)
 *
 * Tests for organization membership management endpoints.
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
    },
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Owner Members Routes', () => {
  let request: SuperTest<typeof app>;

  beforeEach(() => {
    vi.clearAllMocks();
    request = agent(app);
    vi.mocked(verifyToken).mockReturnValue({
      ownerAccountId: 'owner-account-1',
      email: 'admin@example.com',
    });
  });

  describe('POST /api/owners/me/orgs/:orgShortName/members', () => {
    it('adds member to organization successfully', async () => {
      const { prisma } = await import('@/lib/prisma');
      const orgId = '00000000-0000-0000-0000-000000000001';
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
        ownerAccountId: 'owner-account-1',
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: orgId,
        shortName: 'STORMFC',
        name: 'Storm FC',
        ownerAccountId: 'owner-account-1',
      } as any);

      vi.mocked(prisma.ownerUser.findUnique).mockResolvedValue({
        id: 'coach-user-1',
        email: 'coach@example.com',
      } as any);

      // Mock authorization check - user must be org_admin or team_manager
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValueOnce({
        id: 'admin-membership',
        ownerUserId: 'owner-user-1',
        organizationId: 'org-1',
        role: 'org_admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).mockResolvedValueOnce(null); // No existing membership for coach

      vi.mocked(prisma.organizationMember.create).mockResolvedValue({
        id: 'membership-1',
        ownerUserId: 'coach-user-1',
        organizationId: 'org-1',
        role: 'coach',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const response = await request
        .post('/api/owners/me/orgs/STORMFC/members')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'coach@example.com',
          organizationId: '00000000-0000-0000-0000-000000000001',
          role: 'coach',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.role).toBe('coach');
    });

    it('returns 409 if member already exists', async () => {
      const { prisma } = await import('@/lib/prisma');
      const orgId = '00000000-0000-0000-0000-000000000001';
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
        ownerAccountId: 'owner-account-1',
      } as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: orgId,
        shortName: 'STORMFC',
        ownerAccountId: 'owner-account-1',
      } as any);
      vi.mocked(prisma.ownerUser.findUnique).mockResolvedValue({
        id: 'coach-user-1',
        email: 'coach@example.com',
      } as any);
      // Mock authorization check
      vi.mocked(prisma.organizationMember.findUnique)
              .mockResolvedValueOnce({
                id: 'admin-membership',
                ownerUserId: 'owner-user-1',
                organizationId: orgId,
                role: 'org_admin',
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any) // Authorization check
              .mockResolvedValueOnce({
                id: 'existing-membership',
                ownerUserId: 'coach-user-1',
                organizationId: orgId,
          role: 'coach',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any); // Existing membership check

      await request
        .post('/api/owners/me/orgs/STORMFC/members')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'coach@example.com',
          organizationId: orgId,
          role: 'coach',
        })
        .expect(409);
    });
  });

  describe('GET /api/owners/me/orgs/:orgShortName/members', () => {
    it('lists all members of an organization', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.ownerUser.findFirst).mockResolvedValue({
        id: 'owner-user-1',
      } as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        ownerAccountId: 'owner-account-1',
      } as any);
      // Mock authorization check
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
        id: 'admin-membership',
        ownerUserId: 'owner-user-1',
        organizationId: 'org-1',
        role: 'org_admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        {
          id: 'membership-1',
          ownerUserId: 'coach-1',
          organizationId: 'org-1',
          role: 'coach',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      vi.mocked(prisma.ownerUser.findUnique).mockResolvedValue({
        id: 'coach-1',
        email: 'coach@example.com',
      } as any);

      const response = await request
        .get('/api/owners/me/orgs/STORMFC/members')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(Array.isArray(response.body.members)).toBe(true);
    });
  });
});

