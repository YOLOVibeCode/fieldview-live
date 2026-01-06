/**
 * Integration tests for Direct Stream Viewer unlock endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { prisma } from '@/lib/prisma';
import { verifyViewerToken } from '@/lib/viewer-jwt';

describe('Direct Stream Viewer Unlock', () => {
  let request: SuperTest<typeof app>;
  let testGame: { id: string };
  let testOwner: { id: string };

  beforeEach(async () => {
    request = agent(app);

    // Create test owner
    testOwner = await prisma.ownerAccount.create({
      data: {
        name: 'Test Owner',
        status: 'active',
      },
    });

    // Create test game for direct stream
    testGame = await prisma.game.create({
      data: {
        ownerAccountId: testOwner.id,
        title: 'Direct Stream: tchs',
        homeTeam: 'tchs',
        awayTeam: 'TBD',
        startsAt: new Date(),
        priceCents: 0,
        currency: 'USD',
        keywordCode: `DIRECT-TCHS-${Date.now()}`,
        qrUrl: '',
        state: 'live',
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    if (testGame) {
      await prisma.game.delete({ where: { id: testGame.id } }).catch(() => {});
    }
    if (testOwner) {
      await prisma.ownerAccount.delete({ where: { id: testOwner.id } }).catch(() => {});
    }
  });

  describe('POST /api/public/direct/:slug/viewer/unlock', () => {
    it('creates new viewer and returns token', async () => {
      const response = await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(200);

      expect(response.body.viewerToken).toBeDefined();
      expect(response.body.viewer.email).toBe('test@example.com');
      expect(response.body.viewer.displayName).toBe('John D.');
      expect(response.body.gameId).toBe(testGame.id);

      // Verify token claims
      const claims = verifyViewerToken(response.body.viewerToken);
      expect(claims.viewerId).toBe(response.body.viewer.id);
      expect(claims.gameId).toBe(testGame.id);
      expect(claims.slug).toBe('tchs');
      expect(claims.displayName).toBe('John D.');
    });

    it('updates existing viewer on subsequent unlock', async () => {
      // First unlock
      const response1 = await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(200);

      const firstViewerId = response1.body.viewer.id;

      // Second unlock with updated name
      const response2 = await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        })
        .expect(200);

      expect(response2.body.viewer.id).toBe(firstViewerId);
      expect(response2.body.viewer.displayName).toBe('Jane S.');
    });

    it('normalizes email to lowercase', async () => {
      const response = await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'Test@EXAMPLE.com',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(200);

      expect(response.body.viewer.email).toBe('test@example.com');
    });

    it('returns 400 for invalid email', async () => {
      await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'not-an-email',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });

    it('returns 400 for missing required fields', async () => {
      await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });

    it('returns 400 if game not found for slug', async () => {
      await request
        .post('/api/public/direct/nonexistent/viewer/unlock')
        .send({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);
    });

    it('formats display name with last initial only', async () => {
      const response = await request
        .post('/api/public/direct/tchs/viewer/unlock')
        .send({
          email: 'test@example.com',
          firstName: 'Alexander',
          lastName: 'Williamson',
        })
        .expect(200);

      expect(response.body.viewer.displayName).toBe('Alexander W.');
    });
  });
});

