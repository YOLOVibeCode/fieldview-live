import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import scoreboardRouter from '../scoreboard';
import { prisma } from '../../lib/prisma';
import { errorHandler } from '../../middleware/errorHandler';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    directStream: { findUnique: vi.fn() },
    gameScoreboard: { create: vi.fn() },
  },
}));

const STREAM_SLUG = 'test-stream';

function streamFixture() {
  return {
    id: 'ds-1',
    slug: STREAM_SLUG,
    sport: 'soccer',
    scoreboardHomeTeam: 'Twin Cities',
    scoreboardAwayTeam: 'Rivals',
    scoreboardHomeColor: '#111111',
    scoreboardAwayColor: '#222222',
    scoreboard: null,
  };
}

function createdScoreboard() {
  return {
    id: 'sb-1',
    directStreamId: 'ds-1',
    homeTeamName: 'Twin Cities',
    awayTeamName: 'Rivals',
    homeJerseyColor: '#111111',
    awayJerseyColor: '#222222',
    homeScore: 0,
    awayScore: 0,
    clockMode: 'stopped',
    clockSeconds: 0,
    clockStartedAt: null,
    isVisible: true,
    position: 'top',
    producerPassword: null,
    period: 1,
    periodDetail: null,
    lastEditedBy: null,
    lastEditedAt: null,
  };
}

function app(): Express {
  const a = express();
  a.use(express.json());
  a.use('/api/direct', scoreboardRouter);
  a.use(errorHandler);
  return a;
}

const dsFindUnique = prisma.directStream.findUnique as unknown as ReturnType<typeof vi.fn>;
const sbCreate = prisma.gameScoreboard.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scoreboard auto-create', () => {
  it('seeds team names from DirectStream scoreboardHomeTeam/scoreboardAwayTeam', async () => {
    const stream = streamFixture();
    const scoreboard = createdScoreboard();

    dsFindUnique
      .mockResolvedValueOnce(stream)
      .mockResolvedValueOnce({ ...stream, scoreboard });
    sbCreate.mockResolvedValue(scoreboard);

    const res = await request(app()).get(`/api/direct/${STREAM_SLUG}/scoreboard`);

    expect(res.status).toBe(200);
    expect(sbCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        homeTeamName: 'Twin Cities',
        awayTeamName: 'Rivals',
        homeJerseyColor: '#111111',
        awayJerseyColor: '#222222',
      }),
    });
    expect(res.body.homeTeamName).toBe('Twin Cities');
    expect(res.body.awayTeamName).toBe('Rivals');
  });
});
