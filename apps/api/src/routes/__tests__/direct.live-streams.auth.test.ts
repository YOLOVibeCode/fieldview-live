/**
 * The live-stream search returns raw playable URLs (paywalled content), so it must
 * sit behind the real admin-token check. This file does NOT mock that middleware.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, formatErrorResponse } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createDirectLiveStreamsRouter } from '../direct.live-streams';

vi.mock('../../lib/prisma', () => ({
  prisma: { directStream: { findUnique: vi.fn() } },
}));

const JWT_SECRET = 'test-secret-for-live-stream-search';
const findForOwner = vi.fn();

function app(): Express {
  const a = express();
  a.use('/api/direct', createDirectLiveStreamsRouter({ finder: { findForOwner } }));
  a.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json(formatErrorResponse(err));
    }
    throw err;
  });
  return a;
}

function tokenFor(slug: string): string {
  return jwt.sign({ slug, role: 'admin' }, JWT_SECRET, { expiresIn: '5m' });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  (prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ownerAccountId: 'owner-1',
  });
  findForOwner.mockResolvedValue({ streams: [], sources: [] });
});

describe('GET /api/direct/:slug/live-streams — admin token required', () => {
  it('rejects a request with no token and never looks anything up', async () => {
    const res = await request(app()).get('/api/direct/diablos/live-streams');

    expect(res.status).toBe(401);
    expect(findForOwner).not.toHaveBeenCalled();
  });

  it('rejects an admin token issued for a different stream', async () => {
    const res = await request(app())
      .get('/api/direct/diablos/live-streams')
      .set('Authorization', `Bearer ${tokenFor('someone-else')}`);

    expect(res.status).toBe(403);
    expect(findForOwner).not.toHaveBeenCalled();
  });

  it('allows the admin of that stream', async () => {
    const res = await request(app())
      .get('/api/direct/diablos/live-streams')
      .set('Authorization', `Bearer ${tokenFor('diablos')}`);

    expect(res.status).toBe(200);
    expect(findForOwner).toHaveBeenCalledWith('owner-1');
  });
});
