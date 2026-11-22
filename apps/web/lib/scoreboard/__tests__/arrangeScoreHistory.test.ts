import { describe, it, expect } from 'vitest';
import { arrangeScoreHistory } from '../arrangeScoreHistory';
import type { ScoreboardChangeRecord } from '@/lib/api/scoreboard/scoreboardChangeApi';

function row(partial: Partial<ScoreboardChangeRecord> & Pick<ScoreboardChangeRecord, 'id' | 'field' | 'periodLabel' | 'createdAt'>): ScoreboardChangeRecord {
  return {
    fromValue: '0',
    toValue: '1',
    matchClockLabel: '00:00',
    editedBy: 'Guest',
    ...partial,
  };
}

describe('arrangeScoreHistory', () => {
  it('puts the newest half first and keeps goals above clock changes', () => {
    const halves = arrangeScoreHistory([
      row({ id: 'c1', field: 'clock', periodLabel: '1st Half', createdAt: '2026-11-21T20:02:00.000Z' }),
      row({ id: 's1', field: 'homeScore', periodLabel: '2nd Half', createdAt: '2026-11-21T20:44:00.000Z' }),
      row({ id: 'c2', field: 'clock', periodLabel: '2nd Half', createdAt: '2026-11-21T20:42:00.000Z' }),
      row({ id: 's2', field: 'awayScore', periodLabel: '1st Half', createdAt: '2026-11-21T19:10:00.000Z' }),
    ]);

    expect(halves.map((half) => half.period)).toEqual(['2nd Half', '1st Half']);
    expect(halves[0].scores.map((row) => row.id)).toEqual(['s1']);
    expect(halves[0].clocks.map((row) => row.id)).toEqual(['c2']);
    expect(halves[1].scores.map((row) => row.id)).toEqual(['s2']);
    expect(halves[1].clocks.map((row) => row.id)).toEqual(['c1']);
  });
});
