/**
 * MinimalScoreboard Component
 * 
 * Ultra-compact collapsed scoreboard view
 * Shows:
 *   H  1
 *  ---->
 *   A  2
 * 
 * @module MinimalScoreboard
 */

'use client';

import { cn } from '@/lib/utils';

export interface MinimalScoreboardProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeColor: string;
  awayColor: string;
  onExpand: () => void;
  position?: 'left' | 'right';
  className?: string;
  'data-testid'?: string;
}

/**
 * MinimalScoreboard Component
 * 
 * Displays minimal scoreboard with team initials and scores
 */
export function MinimalScoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeColor,
  awayColor,
  onExpand,
  position = 'left',
  className,
  'data-testid': dataTestId,
}: MinimalScoreboardProps) {
  // Extract first letter from team name (fallback to H/A)
  const homeInitial = homeTeamName.trim().charAt(0).toUpperCase() || 'H';
  const awayInitial = awayTeamName.trim().charAt(0).toUpperCase() || 'A';
  
  return (
    <div
      role="region"
      aria-label="Collapsed scoreboard"
      data-testid={dataTestId || 'minimal-scoreboard'}
      className={cn(
        // Base styles
        'flex flex-col',
        'rounded-lg',
        'bg-[var(--fv-color-bg-secondary)]/95',
        'backdrop-blur-md',
        'border border-[var(--fv-color-border)]',
        'shadow-lg',
        'overflow-hidden',
        
        // Positioning
        'w-[100px]',
        
        className
      )}
    >
      {/* Home Team Row */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-3 py-2',
          'text-sm font-bold',
          'border-b border-[var(--fv-color-border)]/30'
        )}
        style={{ color: homeColor }}
      >
        <span data-testid="home-initial">{homeInitial}</span>
        <span data-testid="home-score" className="text-lg">{homeScore}</span>
      </div>
      
      {/* Expand Arrow Button */}
      <button
        onClick={onExpand}
        aria-label="Expand scoreboard"
        data-testid="expand-button"
        className={cn(
          'flex items-center justify-center',
          'py-2',
          'text-[var(--fv-color-text-secondary)]',
          'hover:text-[var(--fv-color-text-primary)]',
          'hover:bg-[var(--fv-color-bg-tertiary)]/50',
          'transition-colors',
          'cursor-pointer',
          'border-b border-[var(--fv-color-border)]/30',
          
          // Mobile tap target
          'min-h-[44px]'
        )}
      >
        <span className="text-xs font-mono">
          {position === 'left' ? '────►' : '◄────'}
        </span>
      </button>
      
      {/* Away Team Row */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-3 py-2',
          'text-sm font-bold'
        )}
        style={{ color: awayColor }}
      >
        <span data-testid="away-initial">{awayInitial}</span>
        <span data-testid="away-score" className="text-lg">{awayScore}</span>
      </div>
    </div>
  );
}
