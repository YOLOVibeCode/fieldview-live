/**
 * PageShell Component
 * 
 * Main layout orchestrator for v2
 * Handles responsive layout switching between mobile and desktop
 * 
 * Usage:
 * ```tsx
 * <PageShell
 *   header={<Header title="Stream" />}
 *   sidePanel={isMobile ? null : <SidePanel />}
 *   bottomNav={isMobile ? <BottomNav /> : null}
 * >
 *   <VideoPlayer />
 * </PageShell>
 * ```
 */

'use client';

import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/v2/useResponsive';

export interface PageShellProps {
  header?: React.ReactNode;
  sidePanel?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * PageShell Component
 * 
 * Responsive layout container that adapts to screen size
 */
export function PageShell({
  header,
  sidePanel,
  bottomNav,
  children,
  className,
}: PageShellProps) {
  const { showSidePanel, showBottomNav } = useResponsive();
  
  return (
    <div
      data-testid="page-shell"
      className={cn(
        'min-h-screen',
        'bg-[var(--fv-color-bg-primary)]',
        'text-[var(--fv-color-text-primary)]',
        className
      )}
    >
      {/* Header */}
      {header}
      
      {/* Main content area */}
      <main
        className={cn(
          // Spacing
          'pt-0', // Header is sticky, no top padding needed
          showBottomNav && 'pb-16', // Bottom nav height
          showSidePanel && 'pr-80', // Side panel width (320px)
        )}
      >
        {children}
      </main>
      
      {/* Side panel (desktop) */}
      {showSidePanel && sidePanel}
      
      {/* Bottom nav (mobile) */}
      {showBottomNav && bottomNav}
    </div>
  );
}

