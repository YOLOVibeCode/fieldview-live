import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rewriteHierarchicalDirectPath } from '../../lib/direct-slug';
import { AppError, formatErrorResponse } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { OwnerLiveStreams } from '../../modules/camera-sources/interfaces';
import { createDirectLiveStreamsRouter } from '../direct.live-streams';

vi.mock('../../middleware/admin-jwt', () => ({
  validateAdminToken: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: { directStream: { findUnique: vi.fn() } },
}));

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const findForOwner = vi.fn<[string], Promise<OwnerLiveStreams>>();

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', rewriteHierarchicalDirectPath);
  a.use('/api/direct', createDirectLiveStreamsRouter({ finder: { findForOwner } }));
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  dsFindUnique.mockResolvedValue({ ownerAccountId: 'owner-1' });
  findForOwner.mockResolvedValue({
    streams: [
      {
        provider: 'veo',
        title: 'Diablos vs Storm',
        streamUrl: 'https://stream.mux.com/LIVE.m3u8',
        startedAt: new Date('2026-11-15T20:00:00.000Z'),
      },
    ],
    sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }],
  });
});

describe('GET /api/direct/:slug/live-streams', () => {
  it('lists what is live on the camera sources of the stream’s owner', async () => {
    const res = await request(app()).get('/api/direct/diablos/live-streams');

    expect(res.status).toBe(200);
    expect(dsFindUnique).toHaveBeenCalledWith({ where: { slug: 'diablos' }, select: { ownerAccountId: true } });
    expect(findForOwner).toHaveBeenCalledWith('owner-1');
    expect(res.body).toEqual({
      streams: [
        {
          provider: 'veo',
          providerName: 'Veo',
          title: 'Diablos vs Storm',
          streamUrl: 'https://stream.mux.com/LIVE.m3u8',
          startedAt: '2026-11-15T20:00:00.000Z',
        },
      ],
      sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }],
    });
  });

  it('returns a null start time when the platform does not give one', async () => {
    findForOwner.mockResolvedValue({
      streams: [{ provider: 'veo', title: 'A vs B', streamUrl: 'https://stream.mux.com/X.m3u8', startedAt: null }],
      sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }],
    });

    const res = await request(app()).get('/api/direct/diablos/live-streams');

    expect(res.body.streams[0].startedAt).toBeNull();
  });

  it('resolves a game page (parent/event) to its parent stream’s owner', async () => {
    const res = await request(app()).get('/api/direct/Diablos/soccer-20261115/live-streams');

    expect(res.status).toBe(200);
    expect(dsFindUnique).toHaveBeenCalledWith({ where: { slug: 'diablos' }, select: { ownerAccountId: true } });
  });

  it('accepts the %2F-encoded game slug the admin panel sends', async () => {
    const res = await request(app()).get('/api/direct/diablos%2Fsoccer-20261115/live-streams');

    expect(res.status).toBe(200);
    expect(dsFindUnique).toHaveBeenCalledWith({ where: { slug: 'diablos' }, select: { ownerAccountId: true } });
  });

  it('returns empty lists when the owner has connected no camera source', async () => {
    findForOwner.mockResolvedValue({ streams: [], sources: [] });

    const res = await request(app()).get('/api/direct/diablos/live-streams');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ streams: [], sources: [] });
  });

  it('passes a needs_reconnect source through so the admin can be told', async () => {
    findForOwner.mockResolvedValue({
      streams: [],
      sources: [{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }],
    });

    const res = await request(app()).get('/api/direct/diablos/live-streams');

    expect(res.body.sources).toEqual([{ provider: 'veo', displayName: 'Veo', status: 'needs_reconnect' }]);
  });

  it('404s for an unknown stream without asking any camera platform', async () => {
    dsFindUnique.mockResolvedValue(null);

    const res = await request(app()).get('/api/direct/nope/live-streams');

    expect(res.status).toBe(404);
    expect(findForOwner).not.toHaveBeenCalled();
  });
});
