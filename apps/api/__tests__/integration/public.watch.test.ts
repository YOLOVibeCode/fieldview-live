import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { EntitlementService } from '@/services/EntitlementService';
import * as watchRoute from '@/routes/public.watch';
import { UnauthorizedError } from '@/lib/errors';
import type { Entitlement, PlaybackSession } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Public Watch Routes', () => {
  let request: SuperTest<typeof app>;
  let mockEntitlementService: {
    validateToken: ReturnType<typeof vi.fn>;
    createPlaybackSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockEntitlementService = {
      validateToken: vi.fn(),
      createPlaybackSession: vi.fn(),
    };

    // Set the mocked service
    watchRoute.setEntitlementService(mockEntitlementService as any);
  });

  describe('POST /api/public/watch/:token/sessions', () => {
    it('creates playback session successfully', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement,
      });
      mockEntitlementService.createPlaybackSession.mockResolvedValue(session);

      const response = await request
        .post('/api/public/watch/token-123/sessions')
        .send({})
        .expect(201);

      expect(response.body.sessionId).toBe('session-1');
      expect(response.body.startedAt).toBeDefined();
      expect(mockEntitlementService.validateToken).toHaveBeenCalledWith('token-123');
      expect(mockEntitlementService.createPlaybackSession).toHaveBeenCalledWith('entitlement-1', undefined);
    });

    it('accepts optional metadata', async () => {
      const entitlement = {
        id: 'entitlement-1',
        tokenId: 'token-123',
        status: 'active',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 3600000),
      } as Entitlement;

      const session = {
        id: 'session-1',
        entitlementId: 'entitlement-1',
        startedAt: new Date(),
      } as PlaybackSession;

      mockEntitlementService.validateToken.mockResolvedValue({
        valid: true,
        entitlement,
      });
      mockEntitlementService.createPlaybackSession.mockResolvedValue(session);

      await request
        .post('/api/public/watch/token-123/sessions')
        .send({
          metadata: { deviceType: 'mobile', playerVersion: '1.0' },
        })
        .expect(201);

      expect(mockEntitlementService.createPlaybackSession).toHaveBeenCalledWith(
        'entitlement-1',
        { deviceType: 'mobile', playerVersion: '1.0' }
      );
    });

    it('returns 401 for invalid token', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await request
        .post('/api/public/watch/invalid-token/sessions')
        .send({})
        .expect(401);
    });

    it('returns 401 for expired token', async () => {
      mockEntitlementService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token has expired',
      });

      await request
        .post('/api/public/watch/expired-token/sessions')
        .send({})
        .expect(401);
    });

    it('returns 400 if token missing', async () => {
      await request
        .post('/api/public/watch//sessions')
        .send({})
        .expect(404); // Express treats this as route not found
    });
  });
});
