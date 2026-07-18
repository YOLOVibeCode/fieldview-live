/**
 * SidePanel Component
 * 
 * Desktop sidebar for scoreboard and chat
 * 
 * Usage:
 * ```tsx
 * <SidePanel position="right">
 *   <ChatPanel />
 *   <ScoreboardPanel />
 * </SidePanel>
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export interface SidePanelProps {
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
  className?: string;
}

/**
 * SidePanel Component
 * 
 * Fixed sidebar for desktop layouts
 */
export function SidePanel({
  children,
  position = 'right',
  width = '320px',
  className,
}: SidePanelProps) {
  return (
    <aside
      data-testid="side-panel"
      className={cn(
        // Fixed positioning
        'fixed top-14 bottom-0',
        position === 'right' ? 'right-0' : 'left-0',
        
        // Background
        'bg-[var(--fv-color-bg-secondary)]',
        'border-l border-[var(--fv-color-border)]',
        
        // Overflow
        'overflow-y-auto',
        
        // Z-index
        'z-[var(--fv-z-sticky)]',
        
        className
      )}
      style={{ width }}
    >
      {children}
    </aside>
  );
}

