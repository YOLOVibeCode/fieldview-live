/** One committed score or clock change. */
export interface ScoreboardChangeRecord {
  id: string;
  field: 'homeScore' | 'awayScore' | 'clock';
  fromValue: string;
  toValue: string;
  matchClockLabel: string;
  periodLabel: string;
  editedBy: string;
  createdAt: string;
}

export interface AppendScoreboardChange {
  scoreboardId: string;
  field: ScoreboardChangeRecord['field'];
  fromValue: string;
  toValue: string;
  matchClockLabel: string;
  periodLabel: string;
  editedBy: string;
}

/** Writes one history row. Skips a no-op. */
export interface IScoreboardChangeWriter {
  append(change: AppendScoreboardChange): Promise<void>;
}

/** Reads history newest first. */
export interface IScoreboardChangeReader {
  listRecent(scoreboardId: string, limit?: number): Promise<ScoreboardChangeRecord[]>;
}
