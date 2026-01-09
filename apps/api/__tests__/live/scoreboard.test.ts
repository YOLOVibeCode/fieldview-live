/**
 * Social Producer Panel API Tests
 * TDD tests for GameScoreboard CRUD and clock control
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { agent } from 'supertest';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/encryption';
import { generateAdminJwt } from '@/lib/admin-jwt';
import type { SuperAgentTest } from 'supertest';
import app from '@/server';

describe('Social Producer Panel APIs', () => {
  let request: SuperAgentTest;
  let testStreamId: string;
  let testScoreboardId: string;
  let adminToken: string;
  const SLUG = 'test-scoreboard';

  beforeAll(async () => {
    request = agent(app);

    // Create a test DirectStream
    const hashedPassword = await hashPassword('test2026');
    const stream = await prisma.directStream.create({
      data: {
        slug: SLUG,
        title: 'Test Scoreboard Stream',
        adminPassword: hashedPassword,
        chatEnabled: true,
      },
    });
    testStreamId = stream.id;

    // Generate admin JWT
    adminToken = generateAdminJwt({ slug: SLUG, role: 'admin' });
  });

  afterAll(async () => {
    // Clean up
    await prisma.gameScoreboard.deleteMany({ where: { directStreamId: testStreamId } });
    await prisma.directStream.delete({ where: { id: testStreamId } });
  });

  beforeEach(async () => {
    // Reset scoreboard state before each test
    await prisma.gameScoreboard.deleteMany({ where: { directStreamId: testStreamId } });
  });

  describe('GET /api/direct/:slug/scoreboard', () => {
    it('should return 404 if scoreboard does not exist', async () => {
      const res = await request.get(`/api/direct/${SLUG}/scoreboard`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return scoreboard with requiresPassword flag', async () => {
      // Create scoreboard with password
      const scoreboard = await prisma.gameScoreboard.create({
        data: {
          directStreamId: testStreamId,
          homeTeamName: 'Warriors',
          awayTeamName: 'Lakers',
          producerPassword: await hashPassword('producer123'),
        },
      });
      testScoreboardId = scoreboard.id;

      const res = await request.get(`/api/direct/${SLUG}/scoreboard`);
      expect(res.status).toBe(200);
      expect(res.body.homeTeamName).toBe('Warriors');
      expect(res.body.awayTeamName).toBe('Lakers');
      expect(res.body.requiresPassword).toBe(true);
      expect(res.body.producerPassword).toBeUndefined(); // Should not expose password
    });

    it('should indicate no password required if producerPassword is null', async () => {
      const scoreboard = await prisma.gameScoreboard.create({
        data: {
          directStreamId: testStreamId,
          producerPassword: null, // Open editing
        },
      });

      const res = await request.get(`/api/direct/${SLUG}/scoreboard`);
      expect(res.status).toBe(200);
      expect(res.body.requiresPassword).toBe(false);
    });
  });

  describe('POST /api/direct/:slug/scoreboard/validate', () => {
    beforeEach(async () => {
      await prisma.gameScoreboard.create({
        data: {
          directStreamId: testStreamId,
          producerPassword: await hashPassword('producer123'),
        },
      });
    });

    it('should return valid=true for correct password', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/scoreboard/validate`)
        .send({ producerPassword: 'producer123' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('should return valid=false for incorrect password', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/scoreboard/validate`)
        .send({ producerPassword: 'wrongpassword' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/scoreboard/validate`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/direct/:slug/scoreboard - Update', () => {
    describe('Access Control - No Password (Open Editing)', () => {
      beforeEach(async () => {
        await prisma.gameScoreboard.create({
          data: {
            directStreamId: testStreamId,
            producerPassword: null, // Open editing
          },
        });
      });

      it('should allow anyone to update when no password is set', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeTeamName: 'Updated Home',
            awayTeamName: 'Updated Away',
            lastEditedBy: 'Public User',
          });

        expect(res.status).toBe(200);
        expect(res.body.homeTeamName).toBe('Updated Home');
        expect(res.body.lastEditedBy).toBe('Public User');
      });

      it('should update scores', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeScore: 42,
            awayScore: 38,
            lastEditedBy: 'Scorekeeper',
          });

        expect(res.status).toBe(200);
        expect(res.body.homeScore).toBe(42);
        expect(res.body.awayScore).toBe(38);
      });

      it('should update jersey colors', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeJerseyColor: '#FF0000',
            awayJerseyColor: '#0000FF',
            lastEditedBy: 'Designer',
          });

        expect(res.status).toBe(200);
        expect(res.body.homeJerseyColor).toBe('#FF0000');
        expect(res.body.awayJerseyColor).toBe('#0000FF');
      });
    });

    describe('Access Control - Password Protected', () => {
      beforeEach(async () => {
        await prisma.gameScoreboard.create({
          data: {
            directStreamId: testStreamId,
            producerPassword: await hashPassword('producer123'),
          },
        });
      });

      it('should reject update without password', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeTeamName: 'Hacker Team',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('password required');
      });

      it('should reject update with incorrect password', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            producerPassword: 'wrongpassword',
            homeTeamName: 'Hacker Team',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Invalid password');
      });

      it('should allow update with correct password', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            producerPassword: 'producer123',
            homeTeamName: 'Authorized Team',
            lastEditedBy: 'Authorized Producer',
          });

        expect(res.status).toBe(200);
        expect(res.body.homeTeamName).toBe('Authorized Team');
      });
    });

    describe('Access Control - Admin JWT Always Allowed', () => {
      beforeEach(async () => {
        await prisma.gameScoreboard.create({
          data: {
            directStreamId: testStreamId,
            producerPassword: await hashPassword('producer123'),
          },
        });
      });

      it('should allow admin to update without producer password', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            homeTeamName: 'Admin Override',
            lastEditedBy: 'Admin',
          });

        expect(res.status).toBe(200);
        expect(res.body.homeTeamName).toBe('Admin Override');
      });
    });

    describe('Validation', () => {
      beforeEach(async () => {
        await prisma.gameScoreboard.create({
          data: { directStreamId: testStreamId, producerPassword: null },
        });
      });

      it('should reject invalid jersey color format', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeJerseyColor: 'red', // Invalid format
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Jersey|Color/i); // Match case-insensitive
      });

      it('should reject negative scores', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeScore: -5,
          });

        expect(res.status).toBe(400);
      });

      it('should reject scores over 999', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard`)
          .send({
            homeScore: 1000,
          });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Clock Control APIs', () => {
    beforeEach(async () => {
      await prisma.gameScoreboard.create({
        data: {
          directStreamId: testStreamId,
          producerPassword: null, // Open for simplicity in clock tests
        },
      });
    });

    describe('POST /api/direct/:slug/scoreboard/clock/start', () => {
      it('should start clock from stopped state', async () => {
        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard/clock/start`);

        expect(res.status).toBe(200);
        expect(res.body.clockMode).toBe('running');
        expect(res.body.clockStartedAt).toBeTruthy();
      });

      it('should resume clock from paused state', async () => {
        // Pause at 10 seconds
        await prisma.gameScoreboard.updateMany({
          where: { directStreamId: testStreamId },
          data: {
            clockMode: 'paused',
            clockSeconds: 10,
          },
        });

        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard/clock/start`);

        expect(res.status).toBe(200);
        expect(res.body.clockMode).toBe('running');
        expect(res.body.clockSeconds).toBe(10);
      });
    });

    describe('POST /api/direct/:slug/scoreboard/clock/pause', () => {
      it('should pause a running clock', async () => {
        // Start clock
        await prisma.gameScoreboard.updateMany({
          where: { directStreamId: testStreamId },
          data: {
            clockMode: 'running',
            clockStartedAt: new Date(Date.now() - 5000), // Started 5 sec ago
            clockSeconds: 0,
          },
        });

        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard/clock/pause`);

        expect(res.status).toBe(200);
        expect(res.body.clockMode).toBe('paused');
        expect(res.body.clockSeconds).toBeGreaterThanOrEqual(5);
        expect(res.body.clockSeconds).toBeLessThanOrEqual(6);
      });
    });

    describe('POST /api/direct/:slug/scoreboard/clock/reset', () => {
      it('should reset clock to 00:00 and stop', async () => {
        // Set clock to some value
        await prisma.gameScoreboard.updateMany({
          where: { directStreamId: testStreamId },
          data: {
            clockMode: 'running',
            clockSeconds: 150,
          },
        });

        const res = await request
          .post(`/api/direct/${SLUG}/scoreboard/clock/reset`);

        expect(res.status).toBe(200);
        expect(res.body.clockMode).toBe('stopped');
        expect(res.body.clockSeconds).toBe(0);
        expect(res.body.clockStartedAt).toBeNull();
      });
    });
  });

  describe('Admin Panel - Create Scoreboard with Producer Password', () => {
    it('should create scoreboard with optional producer password', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/scoreboard/setup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producerPassword: 'newproducer123',
          homeTeamName: 'Initial Home',
          awayTeamName: 'Initial Away',
        });

      expect(res.status).toBe(201);
      expect(res.body.homeTeamName).toBe('Initial Home');

      // Verify password was hashed and set
      const scoreboard = await prisma.gameScoreboard.findUnique({
        where: { directStreamId: testStreamId },
      });
      expect(scoreboard?.producerPassword).toBeTruthy();
      expect(scoreboard?.producerPassword).not.toBe('newproducer123'); // Should be hashed
    });

    it('should create scoreboard without producer password (open editing)', async () => {
      const res = await request
        .post(`/api/direct/${SLUG}/scoreboard/setup`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeamName: 'Open Home',
          awayTeamName: 'Open Away',
        });

      expect(res.status).toBe(201);

      const scoreboard = await prisma.gameScoreboard.findUnique({
        where: { directStreamId: testStreamId },
      });
      expect(scoreboard?.producerPassword).toBeNull();
    });
  });
});

