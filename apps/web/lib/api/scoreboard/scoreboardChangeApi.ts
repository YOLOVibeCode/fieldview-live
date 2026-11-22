/**
 * History of score and clock commits. Separate from the score writer.
 */

import { apiRequest } from '@/lib/api-client';

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

export interface IScoreboardChangeReader {
  listRecent(slug: string): Promise<ScoreboardChangeRecord[]>;
}

export class ScoreboardChangeClient implements IScoreboardChangeReader {
  async listRecent(slug: string): Promise<ScoreboardChangeRecord[]> {
    return apiRequest<ScoreboardChangeRecord[]>(
      `/api/direct/${encodeURIComponent(slug)}/scoreboard/changes`
    );
  }
}

export const scoreboardChangeClient = new ScoreboardChangeClient();
