/**
 * ScoreCard Component
 * 
 * Tappable team score display with team colors
 * Mobile-optimized with haptic feedback
 * 
 * Usage:
 * ```tsx
 * <ScoreCard
 *   teamName="Home Team"
 *   abbreviation="HT"
 *   score={42}
 *   color="#3B82F6"
 *   editable
 *   winning
 *   onTap={() => setEditingTeam('home')}
 * />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export interface ScoreCardProps {
  teamName: string;
  score: number;
  color: string;
  abbreviation?: string;
  editable?: boolean;
  winning?: boolean;
  losing?: boolean;
  variant?: 'default' | 'compact' | 'large';
  onTap?: () => void;
  // 🆕 Viewer editing with +/- buttons
  showIncrementButtons?: boolean;   // Show +/- buttons
  onIncrement?: () => void;         // +1 score
  onDecrement?: () => void;         // -1 score
  className?: string;
  'data-testid'?: string;
}

/**
 * ScoreCard Component
 * 
 * Displays team score with visual states (winning/losing)
 */
export function ScoreCard({
  teamName,
  score,
  color,
  abbreviation,
  editable = false,
  winning = false,
  losing = false,
  variant = 'default',
  onTap,
  showIncrementButtons = false,
  onIncrement,
  onDecrement,
  className,
  'data-testid': dataTestId,
}: ScoreCardProps) {
  const content = (
    <div
      data-testid={dataTestId || 'score-card'}
      className={cn(
        // Base styles
        'flex items-center justify-center gap-2',
        'rounded-xl',
        'border-2',
        'transition-all duration-[var(--fv-duration-normal)]',
        
        // Variant sizes
        variant === 'compact' && 'compact p-3',
        variant === 'default' && 'p-4',
        variant === 'large' && 'large p-6',
        
        // States
        winning && 'winning ring-2 ring-[var(--fv-color-success)] ring-offset-2',
        losing && 'losing opacity-70',
        
        // Editable hover
        editable && 'cursor-pointer hover:scale-105 active:scale-95',
        
        className
      )}
      style={{
        borderColor: color,
        backgroundColor: `${color}10`, // 10% opacity
      }}
      aria-label={`${teamName}: ${score} points${editable ? ', tap to edit' : ''}`}
    >
      {/* Decrement Button */}
      {showIncrementButtons && onDecrement && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDecrement();
          }}
          className={cn(
            'flex items-center justify-center',
            'w-11 h-11', // 44px minimum touch target
            'rounded-lg',
            'bg-[var(--fv-color-bg-tertiary)]',
            'hover:bg-[var(--fv-color-bg-secondary)]',
            'active:scale-95',
            'transition-all',
            'text-[var(--fv-color-text-primary)]',
            'font-bold text-xl'
          )}
          aria-label={`Decrease ${teamName} score`}
          data-testid="score-decrement-button"
        >
          −
        </button>
      )}
      
      {/* Score Display */}
      <div className="flex flex-col items-center justify-center min-w-[80px]">
        {/* Team Name / Abbreviation */}
        <div className="text-xs font-semibold text-[var(--fv-color-text-secondary)] uppercase tracking-wide mb-1">
          {abbreviation || teamName}
        </div>
        
        {/* Score */}
        <div
          className={cn(
            'font-bold text-[var(--fv-color-text-primary)]',
            variant === 'compact' && 'text-3xl',
            variant === 'default' && 'text-4xl',
            variant === 'large' && 'text-5xl',
          )}
          style={{ color }}
        >
          {score}
        </div>
        
        {/* Edit Indicator */}
        {editable && !showIncrementButtons && (
          <div className="text-[10px] text-[var(--fv-color-text-muted)] mt-1">
            Tap to edit
          </div>
        )}
      </div>
      
      {/* Increment Button */}
      {showIncrementButtons && onIncrement && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIncrement();
          }}
          className={cn(
            'flex items-center justify-center',
            'w-11 h-11', // 44px minimum touch target
            'rounded-lg',
            'bg-[var(--fv-color-bg-tertiary)]',
            'hover:bg-[var(--fv-color-bg-secondary)]',
            'active:scale-95',
            'transition-all',
            'text-[var(--fv-color-text-primary)]',
            'font-bold text-xl'
          )}
          aria-label={`Increase ${teamName} score`}
          data-testid="score-increment-button"
        >
          +
        </button>
      )}
    </div>
  );
  
  // Wrap in button if editable
  if (editable && onTap) {
    return (
      <button
        data-testid="score-card-button"
        onClick={onTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap();
          }
        }}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fv-color-primary-500)] rounded-xl"
        aria-label={`Edit ${teamName} score`}
      >
        {content}
      </button>
    );
  }
  
  return content;
}

