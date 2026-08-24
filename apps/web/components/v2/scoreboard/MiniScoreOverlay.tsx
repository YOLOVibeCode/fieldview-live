/**
 * MiniScoreOverlay - VeoLive-style scoreboard overlay on video
 *
 * Top-center bar: [X] period clock [colorBar] TCS 0 - 0 KEL [colorBar]
 * Crowdsource: tap team → scoring sheet, tap period → period sheet, chip → confirm.
 */

'use client';

import { useState, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { X, PanelRightOpen } from 'lucide-react';
import type { TeamData } from './Scoreboard';
import type { OverlayCrowdsourceProps } from './overlayCrowdsource';
import { PendingEventChip } from './PendingEventChip';
import { SportScoreLine } from './SportScoreLine';

export interface MiniScoreOverlayProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  sportId?: string;
  crowdsource?: OverlayCrowdsourceProps;
  className?: string;
  'data-testid'?: string;
}

function stopAnd(e: MouseEvent, fn?: () => void) {
  e.stopPropagation();
  fn?.();
}

export function MiniScoreOverlay({
  homeTeam,
  awayTeam,
  period,
  time,
  sportId,
  crowdsource,
  className,
  'data-testid': dataTestId = 'mini-score-overlay',
}: MiniScoreOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  const reporting = crowdsource?.enabled === true;
  const overlayPosition = 'absolute top-2 left-1/2 -translate-x-1/2 z-20';

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={(e) => stopAnd(e, () => setIsVisible(true))}
        data-testid={`${dataTestId}-restore`}
        aria-label="Show scoreboard"
        className={cn(
          overlayPosition,
          'w-8 h-7 rounded pointer-events-auto',
          'bg-black/70 backdrop-blur-sm',
          'flex items-center justify-center',
          'text-white/80 hover:text-white hover:bg-black/85',
          'transition-colors',
          className,
        )}
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className={cn(overlayPosition, 'flex flex-col items-center gap-1 pointer-events-auto', className)}>
      <div
        role="region"
        aria-label="Mini scoreboard"
        data-testid={dataTestId}
        className={cn(
          'flex items-center',
          'min-w-[240px] h-7 px-2',
          'bg-black/70 backdrop-blur-sm rounded-sm',
          'text-white font-bold text-sm',
        )}
      >
        <button
          type="button"
          onClick={(e) => stopAnd(e, () => setIsVisible(false))}
          data-testid={`${dataTestId}-dismiss`}
          aria-label="Hide scoreboard"
          className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors mr-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <SportScoreLine
          sportId={sportId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          time={time}
          crowdsource={reporting ? crowdsource : undefined}
          variant="overlay"
          className="flex-1"
        />
      </div>

      {reporting && crowdsource.pendingEvent && (
        <PendingEventChip
          event={crowdsource.pendingEvent}
          viewerId={crowdsource.viewerId}
          onConfirm={crowdsource.onConfirmPending}
        />
      )}
    </div>
  );
}
