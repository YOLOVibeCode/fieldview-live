/**
 * GameClock Component
 * 
 * Simple game timer display
 * Shows period and time (optional for future expansion)
 * 
 * Usage:
 * ```tsx
 * <GameClock period="1st Half" time="23:45" />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export interface GameClockProps {
  period?: string;
  time?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * GameClock Component
 * 
 * Displays game period and time
 */
export function GameClock({
  period,
  time,
  variant = 'default',
  className,
}: GameClockProps) {
  // Don't render if no data
  if (!period && !time) return null;
  
  return (
    <div
      data-testid="game-clock"
      className={cn(
        'flex flex-col items-center justify-center',
        'text-[var(--fv-color-text-secondary)]',
        variant === 'compact' && 'text-xs',
        variant === 'default' && 'text-sm',
        className
      )}
    >
      {period && (
        <div className="font-semibold uppercase tracking-wide">
          {period}
        </div>
      )}
      {time && (
        <div className={cn(
          'font-mono',
          variant === 'compact' && 'text-lg',
          variant === 'default' && 'text-xl'
        )}>
          {time}
        </div>
      )}
    </div>
  );
}

