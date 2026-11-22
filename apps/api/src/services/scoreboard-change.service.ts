/**
 * Append-only scoreboard change log.
 * Writer and reader stay separate so a caller can depend on one of them.
 */

import { prisma } from '../lib/prisma';
import type {
  AppendScoreboardChange,
  IScoreboardChangeReader,
  IScoreboardChangeWriter,
  ScoreboardChangeRecord,
} from './scoreboard-change.interfaces';

const DEFAULT_LIMIT = 20;

interface ChangeRow {
  id: string;
  field: string;
  fromValue: string;
  toValue: string;
  matchClockLabel: string;
  periodLabel: string;
  editedBy: string;
  createdAt: Date;
}

interface ChangeStore {
  create(args: { data: Record<string, string> }): Promise<unknown>;
  findMany(args: { where: { gameScoreboardId: string }; orderBy: { createdAt: 'desc' }; take: number }): Promise<ChangeRow[]>;
}

function changeStore(): ChangeStore {
  return (prisma as unknown as { scoreboardChange: ChangeStore }).scoreboardChange;
}

export class PrismaScoreboardChangeLog implements IScoreboardChangeWriter, IScoreboardChangeReader {
  async append(change: AppendScoreboardChange): Promise<void> {
    if (change.fromValue === change.toValue) return;
    await changeStore().create({
      data: {
        gameScoreboardId: change.scoreboardId,
        field: change.field,
        fromValue: change.fromValue,
        toValue: change.toValue,
        matchClockLabel: change.matchClockLabel,
        periodLabel: change.periodLabel,
        editedBy: change.editedBy,
      },
    });
  }

  async listRecent(scoreboardId: string, limit = DEFAULT_LIMIT): Promise<ScoreboardChangeRecord[]> {
    const rows = await changeStore().findMany({
      where: { gameScoreboardId: scoreboardId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      field: row.field as ScoreboardChangeRecord['field'],
      fromValue: row.fromValue,
      toValue: row.toValue,
      matchClockLabel: row.matchClockLabel,
      periodLabel: row.periodLabel,
      editedBy: row.editedBy,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

export const scoreboardChanges = new PrismaScoreboardChangeLog();
