/**
 * MiniScoreOverlay - VeoLive-style scoreboard overlay on video
 *
 * Top-center bar: [X] --:-- [colorBar] TCS 0 - 0 KEL [colorBar]
 * ~250-300px wide, ~28-30px tall. Dismissible with restore button.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, PanelRightOpen } from 'lucide-react';
import type { TeamData } from './Scoreboard';

export interface MiniScoreOverlayProps {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  className?: string;
  'data-testid'?: string;
}

export function MiniScoreOverlay({
  homeTeam,
  awayTeam,
  period,
  time,
  className,
  'data-testid': dataTestId = 'mini-score-overlay',
}: MiniScoreOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  const homeAbbr = (homeTeam.abbreviation || homeTeam.name).slice(0, 3).toUpperCase();
  const awayAbbr = (awayTeam.abbreviation || awayTeam.name).slice(0, 3).toUpperCase();
  const clockDisplay = time ?? period ?? '--:--';

  const overlayPosition = 'absolute top-2 left-1/2 -translate-x-1/2 z-20';

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        data-testid={`${dataTestId}-restore`}
        aria-label="Show scoreboard"
        className={cn(
          overlayPosition,
          'w-8 h-7 rounded',
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
    <div
      role="region"
      aria-label="Mini scoreboard"
      data-testid={dataTestId}
      className={cn(
        overlayPosition,
        'flex items-center',
        'min-w-[240px] h-7 px-2',
        'bg-black/70 backdrop-blur-sm rounded-sm',
        'text-white font-bold text-sm',
        className,
      )}
    >
      {/* X dismiss - far left */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        data-testid={`${dataTestId}-dismiss`}
        aria-label="Hide scoreboard"
        className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors mr-2"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Clock */}
      <span className="tabular-nums text-white/90 shrink-0 mr-3 font-mono text-xs">
        {clockDisplay}
      </span>

      {/* Home: color bar + abbr + score */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="w-[3px] self-stretch shrink-0 rounded-sm"
          style={{ backgroundColor: homeTeam.color }}
        />
        <span>{homeAbbr}</span>
        <span className="tabular-nums">{homeTeam.score}</span>
      </div>

      {/* Separator */}
      <span className="mx-2 shrink-0">-</span>

      {/* Away: score + abbr + color bar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="tabular-nums">{awayTeam.score}</span>
        <span>{awayAbbr}</span>
        <span
          className="w-[3px] self-stretch shrink-0 rounded-sm"
          style={{ backgroundColor: awayTeam.color }}
        />
      </div>
    </div>
  );
}
