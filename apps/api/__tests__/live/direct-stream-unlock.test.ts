/**
 * TDD Tests for DirectStream Admin Unlock API (JWT-based)
 * 
 * Test coverage:
 * - Password validation with database
 * - JWT token generation
 * - Invalid credentials handling
 * - Non-existent stream handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/server';
import { prisma } from '@/lib/prisma';

describe('DirectStream Admin Unlock API (TDD)', () => {
  let request: SuperTest<typeof app>;
  let testSlug: string;
  const correctPassword = 'test-unlock-password-2026';
  const hashedPassword = bcrypt.hashSync(correctPassword, 10);
  const wrongPassword = 'wrong-password';

  beforeAll(async () => {
    request = agent(app);
    process.env.JWT_SECRET = 'test-jwt-secret-for-unlock-tests';
  });

  beforeEach(async () => {
    // Clean up any existing test streams
    await prisma.directStream.deleteMany({
      where: { slug: { startsWith: 'test-unlock-' } },
    });

    // Create a test direct stream with hashed password
    testSlug = `test-unlock-${Date.now()}`;
    await prisma.directStream.create({
      data: {
        slug: testSlug,
        title: 'Test Unlock Stream',
        adminPassword: hashedPassword,
        chatEnabled: true,
        paywallEnabled: false,
        priceInCents: 0,
      },
    });
  });

  afterAll(async () => {
    // Clean up test streams
    await prisma.directStream.deleteMany({
      where: { slug: { startsWith: 'test-unlock-' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/direct/:slug/unlock-admin', () => {
    it('should return 404 for non-existent stream', async () => {
      const res = await request
        .post('/api/direct/non-existent-stream/unlock-admin')
        .send({ password: correctPassword });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 400 when password is missing', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/unlock-admin`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/unlock-admin`)
        .send({ password: wrongPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid password');
    });

    it('should return JWT token for correct password', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/unlock-admin`)
        .send({ password: correctPassword });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');

      // Verify the token is a valid JWT
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
      expect(decoded.slug).toBe(testSlug);
      expect(decoded.role).toBe('admin');
    });

    it('should generate tokens with 1 hour expiration', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/unlock-admin`)
        .send({ password: correctPassword });

      expect(res.status).toBe(200);

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 3600; // 1 hour

      // Allow 5 second tolerance
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });

    it('should be case-insensitive for password comparison', async () => {
      const res = await request
        .post(`/api/direct/${testSlug}/unlock-admin`)
        .send({ password: correctPassword.toUpperCase() });

      // Should fail because bcrypt is case-sensitive
      expect(res.status).toBe(401);
    });
  });
});

