/**
 * Icon Component
 * 
 * Wrapper for SVG icons with consistent sizing
 * 
 * Usage:
 * ```tsx
 * <Icon name="home" size="md" />
 * <Icon name="star" size={24} />
 * ```
 */

'use client';

import { cn } from '@/lib/utils';

export type IconName = 
  | 'home'
  | 'chat'
  | 'scoreboard'
  | 'fullscreen'
  | 'close'
  | 'menu'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down';

export interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  'aria-label'?: string;
}

const ICON_SIZES = {
  sm: 16,
  md: 24,
  lg: 32,
};

// Simple SVG paths for common icons
const ICONS: Record<IconName, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  scoreboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  fullscreen: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
  close: 'M6 18L18 6M6 6l12 12',
  menu: 'M4 6h16M4 12h16M4 18h16',
  'chevron-left': 'M15 19l-7-7 7-7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-up': 'M5 15l7-7 7 7',
  'chevron-down': 'M19 9l-7 7-7-7',
};

export function Icon({
  name,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: IconProps) {
  const iconSize = typeof size === 'number' ? size : ICON_SIZES[size];
  const path = ICONS[name];
  
  return (
    <svg
      data-testid={`icon-${name}`}
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block', className)}
      aria-label={ariaLabel || name}
      role="img"
    >
      <path d={path} />
    </svg>
  );
}

