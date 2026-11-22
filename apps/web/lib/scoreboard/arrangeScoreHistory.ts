/**
 * Arrange a game's change log for the sideline panel.
 * Halves with the newest change come first. Goals stay above clock corrections.
 */

import type { ScoreboardChangeRecord } from '@/lib/api/scoreboard/scoreboardChangeApi';

export interface ArrangedHalf {
  period: string;
  scores: ScoreboardChangeRecord[];
  clocks: ScoreboardChangeRecord[];
}

export function arrangeScoreHistory(changes: ScoreboardChangeRecord[]): ArrangedHalf[] {
  const groups = new Map<string, ArrangedHalf & { latest: string }>();

  for (const change of changes) {
    const period = change.periodLabel || 'Game';
    const group = groups.get(period) ?? { period, scores: [], clocks: [], latest: change.createdAt };
    if (change.createdAt > group.latest) group.latest = change.createdAt;
    if (change.field === 'clock') group.clocks.push(change);
    else group.scores.push(change);
    groups.set(period, group);
  }

  return [...groups.values()]
    .sort((a, b) => (a.latest < b.latest ? 1 : -1))
    .map(({ period, scores, clocks }) => ({ period, scores, clocks }));
}
