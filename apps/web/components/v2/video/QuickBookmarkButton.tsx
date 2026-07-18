'use client';

/**
 * QuickBookmarkButton - One-click bookmark with auto-label.
 *
 * Creates a bookmark at the current time with an auto-generated label
 * like "Bookmark at 12:34". Private by default.
 * Shows an amber flash animation on success.
 */

import { useState, useCallback } from 'react';
import { useCreateBookmark, type VideoBookmark } from '@/lib/hooks/useDVR';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface QuickBookmarkButtonProps {
  directStreamId: string;
  viewerIdentityId: string;
  getCurrentTime: () => number;
  /** Called with the created bookmark for optimistic UI */
  onBookmarkCreated?: (bookmark: VideoBookmark) => void;
  className?: string;
}

export function QuickBookmarkButton({
  directStreamId,
  viewerIdentityId,
  getCurrentTime,
  onBookmarkCreated,
  className = '',
}: QuickBookmarkButtonProps) {
  const [flash, setFlash] = useState(false);
  const { createBookmark, loading } = useCreateBookmark();

  const handleQuickBookmark = useCallback(async () => {
    const time = Math.floor(getCurrentTime());
    const label = `Bookmark at ${formatTime(time)}`;

    try {
      const bookmark = await createBookmark({
        directStreamId,
        viewerIdentityId,
        timestampSeconds: time,
        label,
        isShared: true,
      });

      onBookmarkCreated?.(bookmark);

      // Amber flash animation
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    } catch (err) {
      console.error('Quick bookmark failed:', err);
    }
  }, [directStreamId, viewerIdentityId, getCurrentTime, createBookmark, onBookmarkCreated]);

  return (
    <button
      type="button"
      onClick={handleQuickBookmark}
      disabled={loading}
      className={`
        relative px-3 py-2 rounded-lg min-h-[44px] min-w-[44px]
        bg-amber-600/80 hover:bg-amber-600
        disabled:bg-gray-600 disabled:cursor-not-allowed
        text-white text-sm font-medium
        transition-all duration-150
        shadow-lg shadow-amber-900/30
        ${flash ? 'ring-2 ring-amber-400 scale-105' : ''}
        ${className}
      `}
      aria-label="Quick bookmark current moment"
      data-testid="btn-quick-bookmark"
    >
      {/* Flash overlay */}
      {flash && (
        <span className="absolute inset-0 rounded-lg bg-amber-400/40 animate-ping pointer-events-none" />
      )}
      <svg
        className="w-4 h-4 inline-block mr-1.5"
        fill={flash ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {loading ? '...' : 'Pin'}
    </button>
  );
}
