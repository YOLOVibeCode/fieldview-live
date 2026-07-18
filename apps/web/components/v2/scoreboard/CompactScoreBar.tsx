'use client';

import { cn } from '@/lib/utils';
import type { TeamData } from './Scoreboard';

export interface CompactScoreBarProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * CompactScoreBar - 48px inline score bar for portrait mode
 *
 * Shows: [●HOM] 3 - 2 [AWY●]  │  H1 23:45  │  [▼]
 */
export function CompactScoreBar({
  homeTeam,
  awayTeam,
  period,
  time,
  isExpanded,
  onToggleExpand,
  className,
  'data-testid': testId = 'compact-score-bar',
}: CompactScoreBarProps) {
  const homeAbbr = (homeTeam.abbreviation || homeTeam.name).slice(0, 3).toUpperCase();
  const awayAbbr = (awayTeam.abbreviation || awayTeam.name).slice(0, 3).toUpperCase();

  return (
    <button
      type="button"
      onClick={onToggleExpand}
      data-testid={testId}
      className={cn(
        'flex items-center w-full h-12 px-3 shrink-0',
        'bg-[var(--fv-color-bg-secondary)]',
        'border-y border-[var(--fv-color-border)]',
        'text-[var(--fv-color-text-primary)]',
        'active:bg-[var(--fv-color-bg-tertiary)] transition-colors',
        className,
      )}
    >
      {/* Scores section */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Home team */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: homeTeam.color }}
          />
          <span className="text-xs font-semibold tracking-wide">{homeAbbr}</span>
        </div>

        {/* Score */}
        <span className="font-bold text-lg tabular-nums leading-none">
          {homeTeam.score}
        </span>
        <span className="text-[var(--fv-color-text-muted)] text-xs">-</span>
        <span className="font-bold text-lg tabular-nums leading-none">
          {awayTeam.score}
        </span>

        {/* Away team */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tracking-wide">{awayAbbr}</span>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: awayTeam.color }}
          />
        </div>
      </div>

      {/* Divider + Period/Clock */}
      {(period || time) && (
        <>
          <div className="w-px h-5 bg-[var(--fv-color-border)] mx-3 shrink-0" />
          <div className="flex items-center gap-1.5 text-xs text-[var(--fv-color-text-secondary)]">
            {period && <span className="font-medium">{period}</span>}
            {time && <span className="font-mono tabular-nums">{time}</span>}
          </div>
        </>
      )}

      {/* Spacer + Chevron */}
      <div className="flex-1" />
      <svg
        className={cn(
          'w-4 h-4 text-[var(--fv-color-text-muted)] transition-transform duration-300 shrink-0 ml-2',
          isExpanded && 'rotate-180',
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
