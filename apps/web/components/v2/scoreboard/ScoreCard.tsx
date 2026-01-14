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
  className,
  'data-testid': dataTestId,
}: ScoreCardProps) {
  const content = (
    <div
      data-testid={dataTestId || 'score-card'}
      className={cn(
        // Base styles
        'flex flex-col items-center justify-center',
        'rounded-xl',
        'border-2',
        'transition-all duration-[var(--fv-duration-normal)]',
        
        // Variant sizes
        variant === 'compact' && 'compact p-3 min-w-[80px]',
        variant === 'default' && 'p-4 min-w-[100px]',
        variant === 'large' && 'large p-6 min-w-[120px]',
        
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
      {editable && (
        <div className="text-[10px] text-[var(--fv-color-text-muted)] mt-1">
          Tap to edit
        </div>
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

