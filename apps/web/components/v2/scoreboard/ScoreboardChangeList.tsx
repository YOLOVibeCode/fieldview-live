/**
 * Newest score and clock commits, off the video.
 */

import type { ScoreboardChangeRecord } from '@/lib/api/scoreboard/scoreboardChangeApi';

export interface ScoreboardChangeListProps {
  changes: ScoreboardChangeRecord[];
  homeName: string;
  awayName: string;
}

function teamLabel(field: ScoreboardChangeRecord['field'], homeName: string, awayName: string): string {
  if (field === 'homeScore') return homeName.slice(0, 3).toUpperCase();
  if (field === 'awayScore') return awayName.slice(0, 3).toUpperCase();
  return 'Clock';
}

function when(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ScoreboardChangeList({ changes, homeName, awayName }: ScoreboardChangeListProps) {
  if (changes.length === 0) return null;
  return (
    <ul data-testid="list-score-changes" className="mt-4 space-y-1 text-xs text-white/80" aria-label="Score changes">
      {changes.map((change) => (
        <li key={change.id} data-testid={`row-score-change-${change.id}`}>
          {when(change.createdAt)} · {change.matchClockLabel} · {teamLabel(change.field, homeName, awayName)} {change.fromValue} → {change.toValue}
        </li>
      ))}
    </ul>
  );
}
