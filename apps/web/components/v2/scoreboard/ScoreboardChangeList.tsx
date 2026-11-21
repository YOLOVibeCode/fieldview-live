/**
 * Per-game change log. Newest half first. Goals above clock corrections.
 */

import type { ScoreboardChangeRecord } from '@/lib/api/scoreboard/scoreboardChangeApi';
import { arrangeScoreHistory } from '@/lib/scoreboard/arrangeScoreHistory';

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

function line(change: ScoreboardChangeRecord, homeName: string, awayName: string): string {
  return `${when(change.createdAt)} · ${change.matchClockLabel} · ${teamLabel(change.field, homeName, awayName)} ${change.fromValue} → ${change.toValue}`;
}

export function ScoreboardChangeList({ changes, homeName, awayName }: ScoreboardChangeListProps) {
  const halves = arrangeScoreHistory(changes);
  if (halves.length === 0) return null;

  return (
    <div data-testid="list-score-changes" className="mt-4 space-y-3 text-xs text-white" aria-label="Score changes">
      {halves.map((half) => (
        <section key={half.period} data-testid={`history-${half.period}`}>
          <h4 className="font-semibold uppercase tracking-wide text-white/70">{half.period}</h4>
          {half.scores.length > 0 && (
            <ul className="mt-1 space-y-1">
              {half.scores.map((change) => (
                <li key={change.id}>{line(change, homeName, awayName)}</li>
              ))}
            </ul>
          )}
          {half.clocks.length > 0 && (
            <details className="mt-1 text-white/50">
              <summary className="cursor-pointer">Clock ({half.clocks.length})</summary>
              <ul className="mt-1 space-y-1">
                {half.clocks.map((change) => (
                  <li key={change.id}>{line(change, homeName, awayName)}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ))}
    </div>
  );
}
