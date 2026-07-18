/**
 * Badge Component
 * 
 * Small count indicators for notifications
 * 
 * Usage:
 * ```tsx
 * <Badge count={5} />
 * <Badge count={99} max={99} />
 * <Badge variant="dot" />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export interface BadgeProps {
  count?: number;
  max?: number;
  variant?: 'count' | 'dot';
  color?: 'primary' | 'error' | 'success' | 'warning';
  className?: string;
}

export function Badge({
  count = 0,
  max = 99,
  variant = 'count',
  color = 'error',
  className,
}: BadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  
  if (variant === 'dot') {
    return (
      <span
        data-testid="badge-dot"
        className={cn(
          'inline-block w-2 h-2 rounded-full',
          color === 'primary' && 'bg-[var(--fv-color-primary-500)]',
          color === 'error' && 'bg-[var(--fv-color-error)]',
          color === 'success' && 'bg-[var(--fv-color-success)]',
          color === 'warning' && 'bg-[var(--fv-color-warning)]',
          className
        )}
        aria-label="Notification indicator"
      />
    );
  }
  
  if (count === 0) return null;
  
  return (
    <span
      data-testid="badge-count"
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[20px] h-5 px-1.5',
        'text-xs font-semibold text-white',
        'rounded-full',
        color === 'primary' && 'bg-[var(--fv-color-primary-500)]',
        color === 'error' && 'bg-[var(--fv-color-error)]',
        color === 'success' && 'bg-[var(--fv-color-success)]',
        color === 'warning' && 'bg-[var(--fv-color-warning)]',
        className
      )}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
}

