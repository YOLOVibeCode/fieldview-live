import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import bcrypt from 'bcryptjs';
import { createDirectRouter } from '../direct';
import { prisma } from '../../lib/prisma';
import { errorHandler } from '../../middleware/errorHandler';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn(), create: vi.fn() },
    directStreamEvent: { findUnique: vi.fn() },
    ownerAccount: { findFirst: vi.fn() },
    game: { findFirst: vi.fn(), create: vi.fn() },
    viewerIdentity: { upsert: vi.fn(), findUnique: vi.fn() },
    entitlement: { findFirst: vi.fn() },
  },
}));

const hashed = bcrypt.hashSync('devil2026', 4);

function parentStream() {
  return {
    id: 'ds-denton',
    slug: 'dentondiablos',
    status: 'active',
    gameId: 'game-1',
    ownerAccountId: 'owner-1',
    adminPassword: hashed,
    title: 'Denton Diablos',
    paywallEnabled: false,
    priceInCents: 0,
    streamUrl: 'https://stream.mux.com/deadPlayback.m3u8',
    chatEnabled: true,
    scoreboardEnabled: true,
    scoreboardHomeTeam: 'Denton Diablos',
    scoreboardAwayTeam: 'Away',
    scoreboardHomeColor: '#CC0000',
    scoreboardAwayColor: '#333333',
    game: {
      state: 'idle',
      streamSource: {
        type: 'mux_managed',
        muxPlaybackId: 'deadPlayback',
        protectionLevel: 'moderate',
      },
    },
  };
}

function rayosEvent() {
  return {
    id: 'evt-rayos',
    eventSlug: 'soccer-20260905-fc-rayos',
    title: 'Denton Diablos vs FC Rayos',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    chatEnabled: null,
    scoreboardEnabled: null,
    scheduledStartAt: null,
    scoreboardHomeTeam: 'Denton Diablos',
    scoreboardAwayTeam: 'FC Rayos',
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', createDirectRouter());
  a.use(errorHandler);
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const dsCreate = prisma.directStream.create as unknown as ReturnType<typeof vi.fn>;
const evFindUnique = prisma.directStreamEvent.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-jwt-secret-hier';
});

describe('hierarchical DirectStream routes', () => {
  it('GET parent/event/bootstrap 404s and does not create a slash slug', async () => {
    dsFindUnique.mockResolvedValue(null);

    const res = await request(app()).get(
      '/api/direct/dentondiablos/soccer-2008-20260325/bootstrap'
    );

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
    expect(dsCreate).not.toHaveBeenCalled();
  });

  it('GET encoded parent/event/bootstrap uses event title, away team, and BYO HLS override', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(rayosEvent());

    const slug = encodeURIComponent('dentondiablos/soccer-20260905-fc-rayos');
    const res = await request(app()).get(`/api/direct/${slug}/bootstrap`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Denton Diablos vs FC Rayos');
    expect(res.body.scoreboardHomeTeam).toBe('Denton Diablos');
    expect(res.body.scoreboardAwayTeam).toBe('FC Rayos');
    expect(res.body.streamProvider).toBe('byo_hls');
    expect(res.body.muxPlaybackId).toBeNull();
    expect(res.body.streamUrl).toContain('test-streams.mux.dev');
  });

  it('GET rewritten parent/event/bootstrap finds the event (does not 404)', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(rayosEvent());

    const res = await request(app()).get(
      '/api/direct/dentondiablos/soccer-20260905-fc-rayos/bootstrap'
    );

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Denton Diablos vs FC Rayos');
    expect(res.body.scoreboardAwayTeam).toBe('FC Rayos');
  });

  it('POST parent/event/unlock-admin 404s when the event is missing', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue(null);

    const res = await request(app())
      .post('/api/direct/dentondiablos/soccer-2008-20260325/unlock-admin')
      .send({ password: 'devil2026' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Stream event not found');
  });

  it('POST parent/event/unlock-admin returns a token when the event exists', async () => {
    dsFindUnique.mockResolvedValue(parentStream());
    evFindUnique.mockResolvedValue({ id: 'evt-1', eventSlug: 'soccer-2008-20260325' });
    (prisma.viewerIdentity.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'v1',
    });

    const res = await request(app())
      .post('/api/direct/dentondiablos/soccer-2008-20260325/unlock-admin')
      .send({ password: 'devil2026' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
