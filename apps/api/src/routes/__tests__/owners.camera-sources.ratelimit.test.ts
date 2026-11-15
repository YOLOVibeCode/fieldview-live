/**
 * Each connect attempt is a real sign-in on the camera platform with the owner's
 * password, so attempts are limited per owner. This file uses the real limiter.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AppError, BadRequestError, formatErrorResponse } from '../../lib/errors';
import { createOwnersCameraSourcesRouter } from '../owners.camera-sources';

vi.mock('../../middleware/auth', () => ({
  requireOwnerAuth: (req: Request & { ownerAccountId?: string }, _res: Response, next: NextFunction) => {
    req.ownerAccountId = (req.headers['x-test-owner'] as string) || 'owner-1';
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

const connect = vi.fn(async () => {
  throw new BadRequestError('Veo did not accept that email or password');
});

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use(
    '/api/owners',
    createOwnersCameraSourcesRouter({
      registry: {
        get: () => {
          throw new Error('unused');
        },
        list: () => [{ id: 'veo', displayName: 'Veo', connectFields: [], lister: { listLive: vi.fn() }, connector: { connect } }],
      },
      sources: {
        listByOwner: vi.fn(),
        upsert: vi.fn(),
        setStatus: vi.fn(),
        updateSecrets: vi.fn(),
        deleteByOwnerAndProvider: vi.fn(),
      },
    })
  );
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

describe('PUT /api/owners/me/camera-sources/:provider — attempt limit', () => {
  it('stops an owner after five attempts, and does not affect another owner', async () => {
    const server = app();
    const attempt = (owner: string) =>
      request(server)
        .put('/api/owners/me/camera-sources/veo')
        .set('x-test-owner', owner)
        .send({ fields: { email: 'coach@example.com', password: 'guess' } });

    for (let i = 0; i < 5; i++) {
      expect((await attempt('owner-A')).status).toBe(400);
    }
    expect(connect).toHaveBeenCalledTimes(5);

    const sixth = await attempt('owner-A');
    expect(sixth.status).toBe(429);
    expect(connect).toHaveBeenCalledTimes(5);

    expect((await attempt('owner-B')).status).toBe(400);
    expect(connect).toHaveBeenCalledTimes(6);
  });
});
