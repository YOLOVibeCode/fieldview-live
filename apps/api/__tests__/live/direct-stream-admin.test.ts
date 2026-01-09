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
  });
});
