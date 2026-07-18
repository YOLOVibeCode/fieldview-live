/**
 * TouchButton Component
 * 
 * Mobile-first, touch-optimized button with 44px+ touch targets
 * Follows v2 design system tokens
 * 
 * Usage:
 * ```tsx
 * <TouchButton variant="primary" size="md" onClick={handleClick}>
 *   Submit
 * </TouchButton>
 * 
 * <TouchButton variant="secondary" loading>
 *   Loading...
 * </TouchButton>
 * ```
 */

'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  children: React.ReactNode;
}

/**
 * TouchButton Component
 * 
 * Accessible, touch-friendly button with haptic feedback support
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      haptic = false,
      disabled = false,
      className,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      // Trigger haptic feedback on touch devices
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(10); // 10ms vibration
      }
      
      onClick?.(e);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' && !loading && !disabled) {
        onClick?.(e as any);
      }
    };
    
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-busy={loading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          'fv-btn',
          'inline-flex items-center justify-center',
          'font-medium rounded-lg',
          'transition-all duration-[var(--fv-duration-normal)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-[var(--fv-opacity-disabled)] disabled:cursor-not-allowed',
          
          // Minimum touch target
          'min-h-[var(--fv-touch-target-min)] min-w-[var(--fv-touch-target-min)]',
          
          // Size variants
          size === 'sm' && 'fv-btn-sm px-3 py-2 text-sm min-h-[36px]',
          size === 'md' && 'fv-btn-md px-4 py-2.5 text-base min-h-[44px]',
          size === 'lg' && 'fv-btn-lg px-6 py-3 text-lg min-h-[52px]',
          
          // Variant styles
          variant === 'primary' && [
            'fv-btn-primary',
            'bg-[var(--fv-color-primary-500)] text-white',
            'hover:bg-[var(--fv-color-primary-600)]',
            'active:bg-[var(--fv-color-primary-700)]',
            'focus-visible:ring-[var(--fv-color-primary-500)]',
          ],
          
          variant === 'secondary' && [
            'fv-btn-secondary',
            'bg-[var(--fv-color-bg-elevated)] text-[var(--fv-color-text-primary)]',
            'border border-[var(--fv-color-border)]',
            'hover:bg-[var(--fv-color-bg-secondary)]',
            'focus-visible:ring-[var(--fv-color-primary-500)]',
          ],
          
          variant === 'ghost' && [
            'fv-btn-ghost',
            'bg-transparent text-[var(--fv-color-text-primary)]',
            'hover:bg-[var(--fv-color-bg-elevated)]',
            'focus-visible:ring-[var(--fv-color-primary-500)]',
          ],
          
          variant === 'danger' && [
            'fv-btn-danger',
            'bg-[var(--fv-color-error)] text-white',
            'hover:bg-red-600',
            'active:bg-red-700',
            'focus-visible:ring-[var(--fv-color-error)]',
          ],
          
          // Full width
          fullWidth && 'fv-btn-full w-full',
          
          // Loading state
          loading && 'relative text-transparent',
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span
            data-testid="btn-spinner"
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        
        {/* Button content */}
        {children}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

