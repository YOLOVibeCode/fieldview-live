'use client';

/**
 * BookmarkTooltip - Hover tooltip + click-to-expand popup for bookmark markers.
 *
 * Hover: minimal tooltip (label + time + badge).
 * Click/tap: expanded card with full label, notes, ownership badge, and Jump To button.
 * Supports touch devices via onTouchStart with auto-hide after 2.5s.
 *
 * No Radix dependency -- lightweight CSS approach inside the video player.
 */

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

interface BookmarkTooltipProps {
  label: string;
  time: string;
  isOwn: boolean;
  isOrphaned?: boolean;
  notes?: string;
  onJumpTo?: () => void;
  children: ReactNode;
}

export function BookmarkTooltip({
  label,
  time,
  isOwn,
  isOrphaned = false,
  notes,
  onJumpTo,
  children,
}: BookmarkTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Dismiss expanded popup on Escape or click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsExpanded(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const showTooltipTouch = () => {
    clearTimeout(hideTimerRef.current);
    setIsVisible(true);
    hideTimerRef.current = setTimeout(() => setIsVisible(false), 2500);
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleJumpTo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onJumpTo?.();
    setIsExpanded(false);
  }, [onJumpTo]);

  // Badge display logic
  const badgeLabel = isOwn ? 'You' : isOrphaned ? 'Former Viewer' : 'Shared';
  const badgeColor = isOwn
    ? 'bg-amber-500/20 text-amber-300'
    : isOrphaned
      ? 'bg-gray-500/20 text-gray-300'
      : 'bg-blue-500/20 text-blue-300';

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => { if (!isExpanded) setIsVisible(true); }}
      onMouseLeave={() => { if (!isExpanded) setIsVisible(false); }}
      onFocus={() => { if (!isExpanded) setIsVisible(true); }}
      onBlur={() => { if (!isExpanded) setIsVisible(false); }}
      onTouchStart={showTooltipTouch}
      onClick={handleClick}
    >
      {children}

      {/* Hover tooltip (minimal) */}
      {isVisible && !isExpanded && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          role="tooltip"
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg border border-white/10">
            <div className="font-medium truncate max-w-[200px]">{label}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
              <span className="font-mono">{time}</span>
              <span className={`text-[10px] px-1 rounded ${badgeColor}`}>
                {badgeLabel}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95" />
        </div>
      )}

      {/* Expanded popup (click) */}
      {isExpanded && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-auto"
          role="dialog"
          aria-label={`Bookmark: ${label}`}
          data-testid={`popup-bookmark`}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg px-3.5 py-2.5 shadow-xl border border-white/10 min-w-[200px] max-w-[280px]">
            {/* Label (full, not truncated) */}
            <div className="font-semibold text-sm leading-snug mb-1">{label}</div>

            {/* Timestamp + badge */}
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2">
              <span className="font-mono">{time}</span>
              <span className={`text-[10px] px-1 rounded ${badgeColor}`}>
                {badgeLabel}
              </span>
            </div>

            {/* Notes (if any) */}
            {notes && (
              <p className="text-xs text-gray-300 leading-relaxed mb-2 border-t border-white/10 pt-1.5">
                {notes}
              </p>
            )}

            {/* Jump To button */}
            {onJumpTo && (
              <button
                type="button"
                onClick={handleJumpTo}
                className="w-full mt-1 px-2.5 py-1.5 text-xs font-medium rounded
                  bg-amber-500/20 text-amber-300 hover:bg-amber-500/30
                  transition-colors border border-amber-500/20
                  min-h-[36px]"
                data-testid="btn-jump-to-bookmark"
                aria-label={`Jump to ${time}`}
              >
                Jump to {time}
              </button>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95" />
        </div>
      )}
    </div>
  );
}
