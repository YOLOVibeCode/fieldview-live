/**
 * Public Subscriptions Routes Integration Tests (TDD)
 *
 * Tests for viewer subscription endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SuperTest } from 'supertest';
import { agent } from 'supertest';

import app from '@/server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    viewerIdentity: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Public Subscriptions Routes', () => {
  let request: SuperTest<typeof app>;

  beforeEach(() => {
    vi.clearAllMocks();
    request = agent(app);
  });

  describe('POST /api/public/subscriptions', () => {
    it('subscribes viewer successfully', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.viewerIdentity.findUnique).mockResolvedValue(null); // New viewer
      vi.mocked(prisma.viewerIdentity.create).mockResolvedValue({
        id: 'viewer-1',
        email: 'viewer@example.com',
        phoneE164: '+1234567890',
        smsOptOut: false,
      } as any);

      const response = await request
        .post('/api/public/subscriptions')
        .send({
          email: 'viewer@example.com',
          phoneE164: '+1234567890',
          organizationId: 'org-1',
          preference: 'both',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('viewerId');
    });

    it('returns 400 if no target provided', async () => {
      await request
        .post('/api/public/subscriptions')
        .send({
          email: 'viewer@example.com',
          preference: 'email',
        })
        .expect(400);
    });

    it('validates email format', async () => {
      await request
        .post('/api/public/subscriptions')
        .send({
          email: 'invalid-email',
          organizationId: 'org-1',
          preference: 'email',
        })
        .expect(400);
    });

    it('validates phone format (E.164)', async () => {
      await request
        .post('/api/public/subscriptions')
        .send({
          email: 'viewer@example.com',
          phoneE164: '1234567890', // Missing +
          organizationId: 'org-1',
          preference: 'sms',
        })
        .expect(400);
    });
  });

  describe('POST /api/public/unsubscribe', () => {
    it('unsubscribes viewer successfully', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.viewerIdentity.findUnique).mockResolvedValue({
        id: 'viewer-1',
        email: 'viewer@example.com',
        smsOptOut: false,
      } as any);
      vi.mocked(prisma.viewerIdentity.update).mockResolvedValue({
        id: 'viewer-1',
        smsOptOut: true,
        optOutAt: new Date(),
      } as any);

      const response = await request
        .post('/api/public/unsubscribe')
        .send({
          email: 'viewer@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('returns 404 if email not found', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.viewerIdentity.findUnique).mockResolvedValue(null);

      await request
        .post('/api/public/unsubscribe')
        .send({
          email: 'notfound@example.com',
        })
        .expect(404);
    });
  });
});

