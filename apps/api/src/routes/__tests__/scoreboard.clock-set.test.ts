import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import scoreboardRouter from '../scoreboard';
import { prisma } from '../../lib/prisma';
import { errorHandler } from '../../middleware/errorHandler';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn() },
    gameScoreboard: { update: vi.fn() },
  },
}));

const STREAM_SLUG = 'stingquinn';

function streamWithBoard(clockSeconds = 0) {
  const scoreboard: {
    id: string;
    directStreamId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeJerseyColor: string;
    awayJerseyColor: string;
    homeScore: number;
    awayScore: number;
    clockMode: string;
    clockSeconds: number;
    clockStartedAt: Date | null;
    isVisible: boolean;
    position: string;
    producerPassword: string | null;
    period: number;
    periodDetail: string | null;
    lastEditedBy: string | null;
    lastEditedAt: Date | null;
  } = {
    id: 'sb-1',
    directStreamId: 'ds-1',
    homeTeamName: 'Sting WTX',
    awayTeamName: 'Lonestar CTX',
    homeJerseyColor: '#0A2342',
    awayJerseyColor: '#C4A35A',
    homeScore: 0,
    awayScore: 2,
    clockMode: 'stopped',
    clockSeconds,
    clockStartedAt: null,
    isVisible: true,
    position: 'top',
    producerPassword: null,
    period: 1,
    periodDetail: null,
    lastEditedBy: null,
    lastEditedAt: null,
  };
  return { id: 'ds-1', slug: STREAM_SLUG, sport: 'soccer', scoreboard };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', scoreboardRouter);
  a.use(errorHandler);
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const sbUpdate = prisma.gameScoreboard.update as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /scoreboard/clock/set', () => {
  it('sets the clock to the linesman time and starts it', async () => {
    const stream = streamWithBoard();
    dsFindUnique.mockResolvedValue(stream);
    sbUpdate.mockImplementation(async ({ data }: { data: { clockSeconds: number; clockMode: string } }) => ({
      ...stream.scoreboard,
      ...data,
      clockStartedAt: new Date('2026-11-21T15:56:00.000Z'),
    }));

    const res = await request(app())
      .post(`/api/direct/${STREAM_SLUG}/scoreboard/clock/set`)
      .send({ clockSeconds: 18 * 60 + 40 });

    expect(res.status).toBe(200);
    expect(res.body.clockSeconds).toBe(1120);
    expect(res.body.clockMode).toBe('running');
    expect(sbUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clockSeconds: 1120,
        clockMode: 'running',
      }),
    }));
  });

  it('rejects a clock past 99:59', async () => {
    dsFindUnique.mockResolvedValue(streamWithBoard());
    const res = await request(app())
      .post(`/api/direct/${STREAM_SLUG}/scoreboard/clock/set`)
      .send({ clockSeconds: 100 * 60 });
    expect(res.status).toBe(400);
    expect(sbUpdate).not.toHaveBeenCalled();
  });

  it('requires the producer password when one is set', async () => {
    const stream = streamWithBoard();
    stream.scoreboard.producerPassword = 'hashed';
    dsFindUnique.mockResolvedValue(stream);
    const res = await request(app())
      .post(`/api/direct/${STREAM_SLUG}/scoreboard/clock/set`)
      .send({ clockSeconds: 60 });
    expect(res.status).toBe(401);
    expect(sbUpdate).not.toHaveBeenCalled();
  });
});
