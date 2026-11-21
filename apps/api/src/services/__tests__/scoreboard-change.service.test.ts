import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import { PrismaScoreboardChangeLog } from '../scoreboard-change.service';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    scoreboardChange: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const db = prisma as unknown as {
  scoreboardChange: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};
const create = db.scoreboardChange.create;
const findMany = db.scoreboardChange.findMany;

const change = {
  scoreboardId: 'sb-1',
  field: 'homeScore' as const,
  fromValue: '1',
  toValue: '2',
  matchClockLabel: '05:01',
  periodLabel: '2nd Half',
  editedBy: 'Guest',
};

describe('PrismaScoreboardChangeLog', () => {
  const log = new PrismaScoreboardChangeLog();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not record a commit that does not change the value', async () => {
    await log.append({ ...change, toValue: '1' });
    expect(create).not.toHaveBeenCalled();
  });

  it('appends a score change with the match clock and who saved it', async () => {
    create.mockResolvedValue({ id: 'c-1' });
    await log.append(change);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameScoreboardId: 'sb-1',
        field: 'homeScore',
        fromValue: '1',
        toValue: '2',
        matchClockLabel: '05:01',
        periodLabel: '2nd Half',
        editedBy: 'Guest',
      }),
    });
  });

  it('lists recent changes newest first', async () => {
    findMany.mockResolvedValue([
      {
        id: 'c-2',
        field: 'clock',
        fromValue: '30:00',
        toValue: '05:00',
        matchClockLabel: '05:00',
        periodLabel: '2nd Half',
        editedBy: 'Admin',
        createdAt: new Date('2026-11-21T16:23:00.000Z'),
      },
    ]);
    const rows = await log.listRecent('sb-1');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { gameScoreboardId: 'sb-1' },
      orderBy: { createdAt: 'desc' },
    }));
    expect(rows[0]).toEqual(expect.objectContaining({
      field: 'clock',
      fromValue: '30:00',
      toValue: '05:00',
      createdAt: '2026-11-21T16:23:00.000Z',
    }));
  });
});
