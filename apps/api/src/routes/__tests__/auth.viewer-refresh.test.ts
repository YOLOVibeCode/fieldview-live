/**
 * Integration Tests for Viewer Refresh API Routes (TDD)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../../lib/prisma';
import { viewerRefreshRoutes } from '../../routes/auth.viewer-refresh';
import crypto from 'crypto';

describe('Viewer Refresh API Routes (Integration)', () => {
  let app: express.Application;
  let testViewerEmail: string;
  let testViewerIdentityId: string;
  let testDirectStreamId: string;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/auth/viewer-refresh', viewerRefreshRoutes);
    // Add error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err.name === 'ZodError' || err.statusCode === 400) {
        return res.status(400).json({
          error: err.message || 'Validation error',
          details: err.issues || err.details,
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    });

    // Create test viewer
    testViewerEmail = `api-viewer-${Date.now()}@example.com`;
    const viewer = await prisma.viewerIdentity.create({
      data: {
        email: testViewerEmail,
        emailVerifiedAt: new Date(),
        firstName: 'API',
        lastName: 'Test',
      },
    });
    testViewerIdentityId = viewer.id;

    // Create test direct stream
    const ownerAccount = await prisma.ownerAccount.create({
      data: {
        type: 'owner',
        name: 'Test Owner for API Viewer Refresh',
        status: 'active',
        contactEmail: 'api-viewer-test@example.com',
      },
    });

    const stream = await prisma.directStream.create({
      data: {
        slug: `api-test-${Date.now()}`,
        title: 'Test Stream for API',
        ownerAccountId: ownerAccount.id,
        adminPassword: 'hashed-password',
      },
    });
    testDirectStreamId = stream.id;
  });

  afterEach(async () => {
    // Clean up tokens after each test
    await prisma.viewerRefreshToken.deleteMany({});
  });

  describe('POST /api/auth/viewer-refresh/request', () => {
    it('should accept valid access refresh request', async () => {
      const response = await request(app)
        .post('/api/auth/viewer-refresh/request')
        .send({
          email: testViewerEmail,
          directStreamId: testDirectStreamId,
          redirectUrl: '/direct/test-stream',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('email');
    });

    it('should accept request without optional fields', async () => {
      const response = await request(app)
        .post('/api/auth/viewer-refresh/request')
        .send({
          email: testViewerEmail,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/viewer-refresh/request')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should enforce rate limiting', async () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/viewer-refresh/request')
          .send({
            email: testViewerEmail,
          });
      }

      // 4th request should fail
      const response = await request(app)
        .post('/api/auth/viewer-refresh/request')
        .send({
          email: testViewerEmail,
        });

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/viewer-refresh/verify/:token', () => {
    it('should verify and restore access with valid token', async () => {
      // Create a token first
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.viewerRefreshToken.create({
        data: {
          tokenHash,
          viewerIdentityId: testViewerIdentityId,
          directStreamId: testDirectStreamId,
          redirectUrl: '/direct/test-stream',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await request(app).get(
        `/api/auth/viewer-refresh/verify/${rawToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.viewerIdentityId).toBe(testViewerIdentityId);
      expect(response.body.redirectUrl).toBe('/direct/test-stream');
    });

    it('should reject an invalid token', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');

      const response = await request(app).get(
        `/api/auth/viewer-refresh/verify/${fakeToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject an expired token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.viewerRefreshToken.create({
        data: {
          tokenHash,
          viewerIdentityId: testViewerIdentityId,
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      const response = await request(app).get(
        `/api/auth/viewer-refresh/verify/${rawToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });
  });
});

