/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- supertest's res.body is typed `any` */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, BadRequestError, formatErrorResponse } from '../../lib/errors';
import { ConnectionExpiredError, type ICameraProvider } from '../../modules/camera-sources/interfaces';
import { openSecrets } from '../../modules/camera-sources/secrets';
import type { CameraSourceRecord } from '../../repositories/ICameraSourceRepository';
import { createOwnersCameraSourcesRouter } from '../owners.camera-sources';

vi.mock('../../middleware/auth', () => ({
  requireOwnerAuth: (req: Request & { ownerAccountId?: string }, _res: Response, next: NextFunction) => {
    req.ownerAccountId = 'owner-1';
    next();
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: {} }));

// The connect limiter (5 per 15 minutes) is covered in owners.camera-sources.ratelimit.test.ts.
vi.mock('../../middleware/rateLimit', () => ({
  cameraSourceConnectRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const CLUB_URL = 'https://app.veo.co/clubs/diablos/';
const connect = vi.fn();
const veo: ICameraProvider = {
  id: 'veo',
  displayName: 'Veo',
  connectFields: [
    { name: 'email', label: 'Veo login email', type: 'email' },
    { name: 'clubUrl', label: 'Veo club page', type: 'url' },
    { name: 'password', label: 'Veo password', type: 'password' },
  ],
  lister: { listLive: vi.fn() },
  connector: { connect },
};

const sources = {
  listByOwner: vi.fn<[string], Promise<CameraSourceRecord[]>>(),
  upsert: vi.fn(),
  setStatus: vi.fn(),
  updateSecrets: vi.fn(),
  deleteByOwnerAndProvider: vi.fn<[string, string], Promise<boolean>>(),
};

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use(
    '/api/owners',
    createOwnersCameraSourcesRouter({
      registry: {
        get: (id) => {
          if (id !== 'veo') throw new Error(`Unknown camera provider: "${id}"`);
          return veo;
        },
        list: () => [veo],
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

const stored = (over: Partial<CameraSourceRecord> = {}): CameraSourceRecord => ({
  id: 'cs-1',
  ownerAccountId: 'owner-1',
  provider: 'veo',
  config: { email: 'coach@example.com', clubUrl: CLUB_URL },
  secrets: { sessionCookie: 'v2:deadbeef:00:00:00' },
  status: 'active',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  sources.listByOwner.mockResolvedValue([]);
  sources.deleteByOwnerAndProvider.mockResolvedValue(true);
  connect.mockResolvedValue({
    config: { email: 'coach@example.com', clubUrl: CLUB_URL },
    secrets: { sessionCookie: '_session=PLAINTEXT-COOKIE' },
  });
  sources.upsert.mockImplementation(async (data: { config: Record<string, unknown>; secrets: Record<string, string> }) =>
    stored({ config: data.config, secrets: data.secrets })
  );
});

describe('GET /api/owners/me/camera-sources', () => {
  it('lists every supported provider with its connect form, not connected yet', async () => {
    const res = await request(app()).get('/api/owners/me/camera-sources');

    expect(res.status).toBe(200);
    expect(sources.listByOwner).toHaveBeenCalledWith('owner-1');
    expect(res.body).toEqual({
      providers: [{ id: 'veo', displayName: 'Veo', connectFields: veo.connectFields, connection: null }],
    });
  });

  it('shows the connection status and non-secret settings, and never the secrets', async () => {
    sources.listByOwner.mockResolvedValue([stored({ status: 'needs_reconnect' })]);

    const res = await request(app()).get('/api/owners/me/camera-sources');

    expect(res.body.providers[0].connection).toEqual({
      status: 'needs_reconnect',
      config: { email: 'coach@example.com', clubUrl: CLUB_URL },
    });
    expect(JSON.stringify(res.body)).not.toContain('deadbeef');
    expect(JSON.stringify(res.body)).not.toContain('secrets');
  });
});

describe('PUT /api/owners/me/camera-sources/:provider', () => {
  const fields = { email: 'coach@example.com', clubUrl: CLUB_URL, password: 'hunter2-PLAINTEXT' };

  it('connects through the provider and stores the secrets encrypted for this owner', async () => {
    const res = await request(app()).put('/api/owners/me/camera-sources/veo').send({ fields });

    expect(res.status).toBe(200);
    expect(connect).toHaveBeenCalledWith(fields);

    const saved = sources.upsert.mock.calls[0][0] as { ownerAccountId: string; provider: string; secrets: Record<string, string> };
    expect(saved.ownerAccountId).toBe('owner-1');
    expect(saved.provider).toBe('veo');
    expect(saved.secrets.sessionCookie).toMatch(/^v2:/);
    expect(saved.secrets.sessionCookie).not.toContain('PLAINTEXT');
    expect(openSecrets(saved.secrets, { ownerAccountId: 'owner-1', provider: 'veo' })).toEqual({
      sessionCookie: '_session=PLAINTEXT-COOKIE',
    });
  });

  it('answers with status and settings only: no password, no session', async () => {
    const res = await request(app()).put('/api/owners/me/camera-sources/veo').send({ fields });

    expect(res.body).toEqual({
      id: 'veo',
      displayName: 'Veo',
      connection: { status: 'active', config: { email: 'coach@example.com', clubUrl: CLUB_URL } },
    });
    expect(JSON.stringify(res.body)).not.toContain('PLAINTEXT');
  });

  it('rejects wrong credentials and stores nothing', async () => {
    connect.mockRejectedValue(new BadRequestError('Veo did not accept that email or password'));

    const res = await request(app()).put('/api/owners/me/camera-sources/veo').send({ fields });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/email or password/i);
    expect(sources.upsert).not.toHaveBeenCalled();
  });

  it('rejects a sign-in whose session does not verify, and stores nothing', async () => {
    connect.mockRejectedValue(new ConnectionExpiredError());

    const res = await request(app()).put('/api/owners/me/camera-sources/veo').send({ fields });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Veo/);
    expect(sources.upsert).not.toHaveBeenCalled();
  });

  it('reports the provider as unreachable (502) without leaking the cause', async () => {
    connect.mockRejectedValue(new Error('Veo did not start a login (HTTP 503) secret-internal-detail'));

    const res = await request(app()).put('/api/owners/me/camera-sources/veo').send({ fields });

    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('secret-internal-detail');
    expect(sources.upsert).not.toHaveBeenCalled();
  });

  it('404s for a provider that is not supported', async () => {
    const res = await request(app()).put('/api/owners/me/camera-sources/nope').send({ fields });

    expect(res.status).toBe(404);
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([{}, { fields: 'x' }, { fields: { email: 5 } }, { fields: { email: 'x'.repeat(5000) } }])(
    'rejects a malformed body %j',
    async (body) => {
      const res = await request(app()).put('/api/owners/me/camera-sources/veo').send(body);

      expect(res.status).toBe(400);
      expect(connect).not.toHaveBeenCalled();
    }
  );
});

describe('DELETE /api/owners/me/camera-sources/:provider', () => {
  it('disconnects this owner’s source for that provider', async () => {
    const res = await request(app()).delete('/api/owners/me/camera-sources/veo');

    expect(res.status).toBe(200);
    expect(sources.deleteByOwnerAndProvider).toHaveBeenCalledWith('owner-1', 'veo');
    expect(res.body).toEqual({ disconnected: true });
  });

  it('is harmless when nothing was connected', async () => {
    sources.deleteByOwnerAndProvider.mockResolvedValue(false);

    const res = await request(app()).delete('/api/owners/me/camera-sources/veo');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ disconnected: false });
  });
});
