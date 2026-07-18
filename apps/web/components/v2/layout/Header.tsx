/**
 * Header Component
 * 
 * Sticky navigation header with back/menu buttons and custom actions
 * Responsive design for mobile and desktop
 * 
 * Usage:
 * ```tsx
 * <Header
 *   title="Stream Title"
 *   subtitle="Event Details"
 *   onBack={() => router.back()}
 *   onMenu={() => setMenuOpen(true)}
 *   rightAction={<UserAvatar />}
 * />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';
import { Icon, TouchButton } from '@/components/v2/primitives';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMenu?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  sticky?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Header Component
 * 
 * Navigation header with back/menu buttons and safe area support
 */
export function Header({
  title,
  subtitle,
  onBack,
  onMenu,
  rightAction,
  transparent = false,
  sticky = true,
  className,
  'data-testid': dataTestId,
}: HeaderProps) {
  return (
    <header
      role="banner"
      data-testid={dataTestId}
      className={cn(
        // Base styles
        'w-full z-[var(--fv-z-sticky)]',
        
        // Sticky positioning
        sticky && 'sticky top-0',
        
        // Background
        transparent
          ? 'bg-transparent'
          : 'bg-[var(--fv-color-bg-primary)] border-b border-[var(--fv-color-border)]',
        
        // Safe area (notch support)
        'fv-safe-area-top',
        
        // Backdrop blur for transparent mode
        transparent && 'backdrop-blur-lg',
        
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Back button or menu */}
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <TouchButton
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Go back"
              className="shrink-0"
            >
              <Icon name="chevron-left" size="md" />
            </TouchButton>
          )}
          
          {onMenu && !onBack && (
            <TouchButton
              variant="ghost"
              size="sm"
              onClick={onMenu}
              aria-label="Open menu"
              className="shrink-0"
            >
              <Icon name="menu" size="md" />
            </TouchButton>
          )}
          
          {/* Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--fv-color-text-primary)] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--fv-color-text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {/* Right: Custom action */}
        {rightAction && (
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}

