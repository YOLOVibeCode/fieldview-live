/**
 * Left-edge score tab. Numbers edit in place when viewer editing is allowed.
 * The arrow still expands the panel.
 */

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { TeamData } from './Scoreboard';
import { InlineScoreField } from './InlineScoreField';

export interface EdgeScoreTabProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  editable: boolean;
  onCommit: (team: 'home' | 'away', score: number) => void | Promise<void>;
  onExpand: () => void;
}

const shell = cn(
  'fixed left-0 top-1/2 -translate-y-1/2 z-30',
  'w-14 py-3',
  'bg-black/80 backdrop-blur-md',
  'border-r-2 border-white/20',
  'rounded-r-lg',
  'shadow-2xl shadow-blue-500/10',
  'flex flex-col items-center gap-1',
);

function Row({ team, score }: { team: TeamData; score: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-bold uppercase leading-none text-white">
        {team.name.charAt(0)}
      </span>
      <span
        data-testid="jersey-patch"
        aria-hidden
        className="inline-block w-2 h-2 rounded-[2px] border border-white/80 shrink-0"
        style={{ backgroundColor: team.color }}
      />
      {score}
    </div>
  );
}

export function EdgeScoreTab({ homeTeam, awayTeam, editable, onCommit, onExpand }: EdgeScoreTabProps) {
  if (!editable) {
    return (
      <button
        type="button"
        data-testid="btn-expand-scoreboard"
        className={cn(shell, 'cursor-pointer')}
        onClick={onExpand}
        aria-label="Expand scoreboard"
      >
        <Row team={homeTeam} score={<span className="text-sm font-bold tabular-nums text-white">{homeTeam.score}</span>} />
        <span className="text-white/50 text-[10px] font-bold leading-none" aria-hidden>&rArr;</span>
        <Row team={awayTeam} score={<span className="text-sm font-bold tabular-nums text-white">{awayTeam.score}</span>} />
      </button>
    );
  }

  return (
    <div className={shell} data-testid="scoreboard-edge">
      <Row
        team={homeTeam}
        score={
          <InlineScoreField
            value={homeTeam.score}
            color="#FFFFFF"
            commit={(score) => onCommit('home', score)}
            aria-label={`Edit score for ${homeTeam.name}`}
          />
        }
      />
      <button
        type="button"
        data-testid="btn-expand-scoreboard"
        onClick={onExpand}
        aria-label="Expand scoreboard"
        className="text-white/50 text-[10px] font-bold leading-none hover:text-white"
      >
        &rArr;
      </button>
      <Row
        team={awayTeam}
        score={
          <InlineScoreField
            value={awayTeam.score}
            color="#FFFFFF"
            commit={(score) => onCommit('away', score)}
            aria-label={`Edit score for ${awayTeam.name}`}
          />
        }
      />
    </div>
  );
}
