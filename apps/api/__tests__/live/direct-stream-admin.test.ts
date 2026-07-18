/**
 * TDD Tests for DirectStream Admin Settings API (JWT-based)
 * 
 * Test coverage:
 * - JWT authentication
 * - Settings update (individual fields)
 * - Settings update (multiple fields)
 * - Invalid data handling
 * - Price validation
 * - Message length validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import bcrypt from 'bcryptjs';
import app from '@/server';
import { prisma } from '@/lib/prisma';

describe('DirectStream Admin Settings API (JWT)', () => {
  let request: SuperTest<typeof app>;
  let testSlug: string;
  let adminToken: string;
  const correctPassword = 'test-settings-password-2026';
  const hashedPassword = bcrypt.hashSync(correctPassword, 10);

  beforeAll(async () => {
    request = agent(app);
    process.env.JWT_SECRET = 'test-jwt-secret-for-settings-tests';
  });

  beforeEach(async () => {
    // Clean up any existing test streams
    await prisma.directStream.deleteMany({
      where: { slug: { startsWith: 'test-settings-' } },
    });

    // Create a test direct stream with hashed password
    testSlug = `test-settings-${Date.now()}`;
    const stream = await prisma.directStream.create({
      data: {
        slug: testSlug,
        title: 'Test Settings Stream',
        adminPassword: hashedPassword,
        streamUrl: 'https://stream.mux.com/test123.m3u8',
        chatEnabled: true,
        paywallEnabled: false,
        priceInCents: 0,
      },
    });

    // Get admin token
    const unlockRes = await request
      .post(`/api/direct/${testSlug}/unlock-admin`)
      .send({ password: correctPassword });
    
    adminToken = unlockRes.body.token;
  });

  afterAll(async () => {
    // Clean up test streams
    await prisma.directStream.deleteMany({
      where: { slug: { startsWith: 'test-settings-' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/direct/:slug/settings', () => {
    it('should require authorization header', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .send({ streamUrl: 'https://new.stream.com/test.m3u8' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('authorization');
    });

    it('should reject invalid tokens', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ streamUrl: 'https://new.stream.com/test.m3u8' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid token');
    });

    it('should reject tokens for wrong stream', async () => {
      // Create another stream
      const otherSlug = `test-settings-other-${Date.now()}`;
      await prisma.directStream.create({
        data: {
          slug: otherSlug,
          title: 'Other Stream',
          adminPassword: hashedPassword,
        },
      });

      // Try to use token for different stream
      const res = await request
        .post(`/api/direct/${otherSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ streamUrl: 'https://new.stream.com/test.m3u8' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not valid for this stream');
    });

    it('should update stream URL with valid token', async () => {
      const newUrl = 'https://updated.stream.com/new.m3u8';
      
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ streamUrl: newUrl });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.streamUrl).toBe(newUrl);
    });

    it('should toggle chat enabled', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ chatEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.settings.chatEnabled).toBe(false);
    });

    it('should enable paywall with price', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paywallEnabled: true,
          priceInCents: 499,
          paywallMessage: 'Support our stream!',
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.paywallEnabled).toBe(true);
      expect(res.body.settings.priceInCents).toBe(499);
      expect(res.body.settings.paywallMessage).toBe('Support our stream!');
    });

    it('should reject invalid URL format', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ streamUrl: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject negative price', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceInCents: -100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject price over maximum', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceInCents: 100000 }); // > $999.99

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject message over 1000 characters', async () => {
      const longMessage = 'a'.repeat(1001);
      
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paywallMessage: longMessage });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should update multiple fields at once', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streamUrl: 'https://multi.stream.com/test.m3u8',
          chatEnabled: false,
          paywallEnabled: true,
          priceInCents: 999,
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.streamUrl).toBe('https://multi.stream.com/test.m3u8');
      expect(res.body.settings.chatEnabled).toBe(false);
      expect(res.body.settings.paywallEnabled).toBe(true);
      expect(res.body.settings.priceInCents).toBe(999);
    });

    // 🆕 Stream-page decoupling: Settings save without stream URL
    it('should save settings without stream URL (decoupled)', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          chatEnabled: true,
          scoreboardEnabled: true,
          paywallEnabled: false,
          // streamUrl intentionally omitted
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.chatEnabled).toBe(true);
      expect(res.body.settings.scoreboardEnabled).toBe(true);
      // Stream URL should remain unchanged
      expect(res.body.settings.streamUrl).toBe('https://stream.mux.com/test123.m3u8');
    });

    // 🆕 Stream-page decoupling: Invalid URL doesn't block other settings
    it('should save other settings when stream URL is invalid (fault-tolerant)', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streamUrl: 'not-a-valid-url', // Invalid URL
          chatEnabled: true,
          scoreboardEnabled: true,
        });

      // Should still succeed
      expect(res.status).toBe(200);
      
      // Other settings should be saved
      expect(res.body.settings.chatEnabled).toBe(true);
      expect(res.body.settings.scoreboardEnabled).toBe(true);
      
      // Invalid URL should be skipped (original URL preserved)
      expect(res.body.settings.streamUrl).toBe('https://stream.mux.com/test123.m3u8');
    });

    // 🆕 Stream-page decoupling: Can clear stream URL
    it('should allow clearing stream URL', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          streamUrl: null,
          chatEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.streamUrl).toBeNull();
      expect(res.body.settings.chatEnabled).toBe(true);
    });
  });

  // 🆕 Stream-page decoupling: Bootstrap endpoint tests
  describe('GET /api/direct/:slug/bootstrap', () => {
    it('should return decoupled page and stream structure', async () => {
      const res = await request.get(`/api/direct/${testSlug}/bootstrap`);

      expect(res.status).toBe(200);
      
      // New decoupled structure
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('stream');
      
      // Page config
      expect(res.body.page).toHaveProperty('slug', testSlug);
      expect(res.body.page).toHaveProperty('chatEnabled');
      expect(res.body.page).toHaveProperty('scoreboardEnabled');
      
      // Stream config (should not be null since we have a stream URL)
      expect(res.body.stream).not.toBeNull();
      expect(res.body.stream).toHaveProperty('status');
      expect(res.body.stream).toHaveProperty('url');
      
      // Backward compatibility
      expect(res.body).toHaveProperty('slug', testSlug);
      expect(res.body).toHaveProperty('streamUrl');
    });

    it('should return null stream when stream URL not configured', async () => {
      // Create stream without URL
      const noStreamSlug = `test-no-stream-${Date.now()}`;
      await prisma.directStream.create({
        data: {
          slug: noStreamSlug,
          title: 'Test No Stream',
          adminPassword: hashedPassword,
          streamUrl: null, // No stream configured
          chatEnabled: true,
        },
      });

      const res = await request.get(`/api/direct/${noStreamSlug}/bootstrap`);

      expect(res.status).toBe(200);
      expect(res.body.page).toHaveProperty('slug', noStreamSlug);
      expect(res.body.stream).toBeNull(); // Key test: stream is null
      
      // Backward compat: flat field also null
      expect(res.body.streamUrl).toBeNull();
      
      // Cleanup
      await prisma.directStream.delete({ where: { slug: noStreamSlug } });
    });
  });
});
