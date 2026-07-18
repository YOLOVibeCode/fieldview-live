/**
 * BottomNav Component
 * 
 * Mobile-friendly bottom navigation bar
 * Fixed to bottom with safe area support
 * 
 * Usage:
 * ```tsx
 * <BottomNav
 *   items={[
 *     { id: 'home', icon: 'home', label: 'Home', active: true, onClick: () => {} },
 *     { id: 'chat', icon: 'chat', label: 'Chat', badge: 3, onClick: () => {} },
 *   ]}
 * />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';
import { Icon, Badge, type IconName } from '@/components/v2/primitives';

export interface BottomNavItem {
  id: string;
  icon: IconName;
  label: string;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  safeArea?: boolean;
  className?: string;
}

/**
 * BottomNav Component
 * 
 * Thumb-friendly navigation for mobile devices
 */
export function BottomNav({
  items,
  safeArea = true,
  className,
}: BottomNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      data-testid="bottom-nav"
      className={cn(
        // Fixed to bottom
        'fixed bottom-0 left-0 right-0',
        'z-[var(--fv-z-sticky)]',
        
        // Background & border
        'bg-[var(--fv-color-bg-primary)]',
        'border-t border-[var(--fv-color-border)]',
        
        // Safe area (home indicator)
        safeArea && 'fv-safe-area-bottom',
        
        // Backdrop blur
        'backdrop-blur-md',
        
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            data-testid={`bottom-nav-${item.id}`}
            className={cn(
              // Base button styles
              'flex flex-col items-center justify-center',
              'min-w-[64px] h-12 px-2',
              'rounded-lg',
              'transition-colors duration-[var(--fv-duration-fast)]',
              
              // Active state
              item.active
                ? 'text-[var(--fv-color-primary-500)]'
                : 'text-[var(--fv-color-text-secondary)]',
              
              // Hover state (desktop)
              'hover:bg-[var(--fv-color-bg-elevated)]',
              
              // Touch feedback
              'active:scale-95',
              
              // Focus visible
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fv-color-primary-500)]'
            )}
          >
            {/* Icon with badge */}
            <div className="relative">
              <Icon name={item.icon} size="md" />
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1">
                  <Badge count={item.badge} max={9} />
                </div>
              )}
            </div>
            
            {/* Label */}
            <span className="text-[10px] font-medium mt-0.5 leading-none">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

