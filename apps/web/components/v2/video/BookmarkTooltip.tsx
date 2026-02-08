'use client';

/**
 * BookmarkTooltip - Hover tooltip for bookmark markers on the timeline.
 *
 * Shows bookmark label, timestamp, and whether it's the viewer's own or shared.
 * Uses a simple CSS tooltip approach (no Radix dependency to keep it lightweight
 * inside the video player).
 */

import { useState, type ReactNode } from 'react';

interface BookmarkTooltipProps {
  label: string;
  time: string;
  isOwn: boolean;
  children: ReactNode;
}

export function BookmarkTooltip({
  label,
  time,
  isOwn,
  children,
}: BookmarkTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          role="tooltip"
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg border border-white/10">
            <div className="font-medium truncate max-w-[200px]">{label}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
              <span className="font-mono">{time}</span>
              <span className={`text-[10px] px-1 rounded ${isOwn ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {isOwn ? 'You' : 'Shared'}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95" />
        </div>
      )}
    </div>
  );
}
