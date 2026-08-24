'use client';

import { cn } from '@/lib/utils';
import type { TeamData } from './Scoreboard';
import type { OverlayCrowdsourceProps } from './overlayCrowdsource';
import { PendingEventChip } from './PendingEventChip';
import { SportScoreLine } from './SportScoreLine';

export interface CompactScoreBarProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  sportId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  crowdsource?: OverlayCrowdsourceProps;
  className?: string;
  'data-testid'?: string;
}

/**
 * CompactScoreBar - 48px inline score bar for portrait mode
 *
 * Display: [●HOM] 3 - 2 [AWY●]  │  H1 23:45  │  [▼]
 * Crowdsource: team/period taps report; chevron still expands.
 */
export function CompactScoreBar({
  homeTeam,
  awayTeam,
  period,
  time,
  sportId,
  isExpanded,
  onToggleExpand,
  crowdsource,
  className,
  'data-testid': testId = 'compact-score-bar',
}: CompactScoreBarProps) {
  const cs = crowdsource?.enabled ? crowdsource : undefined;

  const chevron = (
    <svg
      className={cn(
        'w-4 h-4 text-[var(--fv-color-text-muted)] transition-transform duration-300 shrink-0',
        isExpanded && 'rotate-180',
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );

  const barClass = cn(
    'flex items-center w-full h-12 px-3 shrink-0',
    'bg-[var(--fv-color-bg-secondary)]',
    'border-y border-[var(--fv-color-border)]',
    'text-[var(--fv-color-text-primary)]',
    className,
  );

  if (!cs) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        data-testid={testId}
        className={cn(barClass, 'active:bg-[var(--fv-color-bg-tertiary)] transition-colors')}
      >
        <SportScoreLine
          sportId={sportId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          time={time}
          variant="bar"
        />
        <div className="flex-1" />
        <span className="ml-2">{chevron}</span>
      </button>
    );
  }

  return (
    <div role="region" aria-label="Score bar" data-testid={testId} className={barClass}>
      <SportScoreLine
        sportId={sportId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period={period}
        time={time}
        crowdsource={cs}
        variant="bar"
      />
      {cs.pendingEvent && (
        <div className="ml-2 shrink-0">
          <PendingEventChip
            event={cs.pendingEvent}
            viewerId={cs.viewerId}
            onConfirm={cs.onConfirmPending}
          />
        </div>
      )}
      <div className="flex-1" />
      <button
        type="button"
        data-testid="btn-expand-scoreboard"
        aria-label={isExpanded ? 'Collapse scoreboard' : 'Expand scoreboard'}
        aria-expanded={isExpanded}
        onClick={onToggleExpand}
        className="p-1 rounded hover:bg-[var(--fv-color-bg-tertiary)]"
      >
        {chevron}
      </button>
    </div>
  );
}
