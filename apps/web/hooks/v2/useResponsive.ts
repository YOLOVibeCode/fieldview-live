/**
 * useResponsive Hook
 * 
 * Mobile-first responsive behavior detection
 * Provides breakpoint and device information for layout decisions
 * 
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop, breakpoint, orientation } = useResponsive();
 * 
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 * return <DesktopLayout />;
 * ```
 */

'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  // Device categories
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Input types
  isTouch: boolean;
  
  // Screen info
  breakpoint: Breakpoint;
  orientation: Orientation;
  width: number;
  height: number;
  
  // Layout decisions
  showBottomNav: boolean;
  showSidePanel: boolean;
  scoreboardPosition: 'floating' | 'sidebar';
  chatPosition: 'bottom-sheet' | 'sidebar';
}

// Breakpoint thresholds (mobile-first)
const BREAKPOINTS = {
  xs: 0,
  sm: 375,
  md: 640,
  lg: 1024,
  xl: 1440,
} as const;

/**
 * Determine current breakpoint based on width
 */
function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Determine orientation based on dimensions
 */
function getOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Check if device supports touch
 */
function checkTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - IE10/11
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * useResponsive Hook
 * 
 * Monitors window size, orientation, and device capabilities
 * Provides computed layout decisions based on screen size
 */
export function useResponsive(): ResponsiveState {
  // Track if component is mounted to avoid hydration mismatches
  const [mounted, setMounted] = useState(false);
  
  const [state, setState] = useState<ResponsiveState>(() => {
    // SSR-safe initialization - always return mobile defaults
    // This will match server-rendered content
    return {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isTouch: true,
      breakpoint: 'sm',
      orientation: 'portrait',
      width: 375,
      height: 667,
      showBottomNav: true,
      showSidePanel: false,
      scoreboardPosition: 'floating',
      chatPosition: 'bottom-sheet',
    };
  });
  
  useEffect(() => {
    // Mark as mounted on first client render
    setMounted(true);
    
    // Skip on server
    if (typeof window === 'undefined') return;
    
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);
      const orientation = getOrientation(width, height);
      const isTouch = checkTouchSupport();
      
      const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
      const isTablet = breakpoint === 'md';
      const isDesktop = breakpoint === 'lg' || breakpoint === 'xl';
      
      setState({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        breakpoint,
        orientation,
        width,
        height,
        showBottomNav: isMobile,
        showSidePanel: isDesktop,
        scoreboardPosition: isMobile ? 'floating' : 'sidebar',
        chatPosition: isMobile ? 'bottom-sheet' : 'sidebar',
      });
    };
    
    // Update on resize
    window.addEventListener('resize', updateState);
    
    // Update on orientation change
    window.addEventListener('orientationchange', updateState);
    
    // Initial update (after mount)
    updateState();
    
    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);
  
  // Return default state until mounted (avoids hydration mismatch)
  return state;
}

/**
 * useBreakpoint Hook
 * 
 * Simplified hook for checking specific breakpoints
 * 
 * Usage:
 * ```tsx
 * const breakpoint = useBreakpoint();
 * const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
 * ```
 */
export function useBreakpoint(): Breakpoint {
  const { breakpoint } = useResponsive();
  return breakpoint;
}

/**
 * useIsMobile Hook
 * 
 * Simplified hook for mobile detection
 * 
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile();
 * if (isMobile) return <MobileView />;
 * ```
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

/**
 * useIsTouch Hook
 * 
 * Simplified hook for touch detection
 * 
 * Usage:
 * ```tsx
 * const isTouch = useIsTouch();
 * const hoverClass = isTouch ? '' : 'hover:scale-110';
 * ```
 */
export function useIsTouch(): boolean {
  const { isTouch } = useResponsive();
  return isTouch;
}

