/** Connecting a provider handles credentials, so every verb must sit behind the real owner auth. */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { createOwnersCameraSourcesRouter } from '../owners.camera-sources';

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

const sources = {
  listByOwner: vi.fn(),
  upsert: vi.fn(),
  setStatus: vi.fn(),
  updateSecrets: vi.fn(),
  deleteByOwnerAndProvider: vi.fn(),
};
const connect = vi.fn();

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use(
    '/api/owners',
    createOwnersCameraSourcesRouter({
      registry: {
        get: () => ({ id: 'veo', displayName: 'Veo', connectFields: [], lister: { listLive: vi.fn() }, connector: { connect } }),
        list: () => [],
      },
      sources,
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

describe('owner camera sources — owner token required', () => {
  it.each([
    ['get', '/api/owners/me/camera-sources'],
    ['put', '/api/owners/me/camera-sources/veo'],
    ['delete', '/api/owners/me/camera-sources/veo'],
  ] as const)('%s %s is rejected without a token', async (method, path) => {
    const res = await request(app())[method](path).send({ fields: { email: 'a@b.co' } });

    expect(res.status).toBe(401);
    expect(sources.listByOwner).not.toHaveBeenCalled();
    expect(sources.upsert).not.toHaveBeenCalled();
    expect(sources.deleteByOwnerAndProvider).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it('is rejected with a token that is not valid', async () => {
    const res = await request(app()).get('/api/owners/me/camera-sources').set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(sources.listByOwner).not.toHaveBeenCalled();
  });
});
