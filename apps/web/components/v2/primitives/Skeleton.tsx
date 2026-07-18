/**
 * Skeleton Component
 * 
 * Loading placeholders with pulse animation
 * 
 * Usage:
 * ```tsx
 * <Skeleton variant="text" width="200px" />
 * <Skeleton variant="circle" size={48} />
 * <Skeleton variant="rectangle" width="100%" height="200px" />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle';
  width?: string | number;
  height?: string | number;
  size?: number;  // For circle variant
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  size,
  className,
}: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={cn(
        'bg-[var(--fv-color-bg-elevated)] animate-pulse',
        variant === 'text' && 'h-4 rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'rectangle' && 'rounded-lg',
        className
      )}
      style={{
        width: variant === 'circle' ? size : width,
        height: variant === 'circle' ? size : height,
      }}
      aria-busy="true"
      aria-label="Loading..."
    />
  );
}

