/**
 * Viewer Analytics - Active Viewers TDD Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { agent } from 'supertest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/encryption';
import type { SuperAgentTest } from 'supertest';
import app from '@/server';

describe('Viewer Analytics - Active Viewers', () => {
  let request: SuperAgentTest;
  let testStreamId: string;
  let testViewer1Id: string;
  let testViewer2Id: string;
  let testViewer3Id: string;
  const SLUG = 'test-analytics';

  beforeAll(async () => {
    request = agent(app);

    // Create test DirectStream
    const stream = await prisma.directStream.create({
      data: {
        slug: SLUG,
        title: 'Test Analytics Stream',
        adminPassword: await hashPassword('admin123'),
        chatEnabled: true,
      },
    });
    testStreamId = stream.id;

    // Create test viewers
    const viewer1 = await prisma.viewerIdentity.create({
      data: {
        email: 'active1@test.com',
        firstName: 'Active',
        lastName: 'User1',
        lastSeenAt: new Date(), // Recently active
      },
    });
    testViewer1Id = viewer1.id;

    const viewer2 = await prisma.viewerIdentity.create({
      data: {
        email: 'active2@test.com',
        firstName: 'Active',
        lastName: 'User2',
        lastSeenAt: new Date(Date.now() - 30 * 1000), // Active 30s ago
      },
    });
    testViewer2Id = viewer2.id;

    const viewer3 = await prisma.viewerIdentity.create({
      data: {
        email: 'inactive@test.com',
        firstName: 'Inactive',
        lastName: 'User',
        lastSeenAt: new Date(Date.now() - 10 * 60 * 1000), // Inactive (10 min ago)
      },
    });
    testViewer3Id = viewer3.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.viewerIdentity.deleteMany({
      where: { id: { in: [testViewer1Id, testViewer2Id, testViewer3Id] } },
    });
    await prisma.directStream.delete({ where: { id: testStreamId } });
  });

  describe('GET /api/direct/:slug/viewers/active', () => {
    it('should return list of active viewers (within 2 minutes)', async () => {
      const res = await request
        .get(`/api/direct/${SLUG}/viewers/active`);

      expect(res.status).toBe(200);
      expect(res.body.viewers).toBeInstanceOf(Array);
      expect(res.body.viewers.length).toBe(2); // viewer1 and viewer2

      const viewer1 = res.body.viewers.find((v: any) => v.email === 'active1@test.com');
      expect(viewer1).toBeDefined();
      expect(viewer1.firstName).toBe('Active');
      expect(viewer1.lastName).toBe('User1');
      expect(viewer1.isActive).toBe(true);

      const viewer2 = res.body.viewers.find((v: any) => v.email === 'active2@test.com');
      expect(viewer2).toBeDefined();
      expect(viewer2.isActive).toBe(true);

      // Inactive viewer should not be in list
      const viewer3 = res.body.viewers.find((v: any) => v.email === 'inactive@test.com');
      expect(viewer3).toBeUndefined();
    });

    it('should include total count', async () => {
      const res = await request
        .get(`/api/direct/${SLUG}/viewers/active`);

      expect(res.status).toBe(200);
      expect(res.body.totalActive).toBe(2);
    });

    it('should return 404 for non-existent stream', async () => {
      const res = await request
        .get('/api/direct/nonexistent/viewers/active');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/direct/:slug/heartbeat', () => {
    it('should update lastSeenAt for viewer', async () => {
      const before = new Date(Date.now() - 60 * 1000); // 1 minute ago
      
      await prisma.viewerIdentity.update({
        where: { id: testViewer1Id },
        data: { lastSeenAt: before },
      });

      const res = await request
        .post(`/api/direct/${SLUG}/heartbeat`)
        .send({ email: 'active1@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify lastSeenAt was updated
      const viewer = await prisma.viewerIdentity.findUnique({
        where: { id: testViewer1Id },
      });

      expect(viewer?.lastSeenAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('should create viewer if does not exist', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/heartbeat`)
        .send({
          email: 'newviewer@test.com',
          firstName: 'New',
          lastName: 'Viewer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify viewer was created
      const viewer = await prisma.viewerIdentity.findUnique({
        where: { email: 'newviewer@test.com' },
      });

      expect(viewer).toBeDefined();
      expect(viewer?.firstName).toBe('New');

      // Cleanup
      if (viewer) {
        await prisma.viewerIdentity.delete({ where: { id: viewer.id } });
      }
    });

    it('should require email', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/heartbeat`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent stream', async () => {
      const res = await request
        .post('/api/direct/nonexistent/heartbeat')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(404);
    });
  });
});

