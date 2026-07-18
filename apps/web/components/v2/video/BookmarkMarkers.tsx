'use client';

/**
 * BookmarkMarkers - Visual bookmark tabs on the video timeline.
 *
 * Renders absolutely-positioned tab/flag markers at the correct percentage
 * positions along the timeline track. Own bookmarks are amber, shared are blue,
 * orphaned (former viewer) are gray. Hovering shows a tooltip; clicking expands.
 * New bookmarks arriving via SSE get a subtle entrance animation.
 */

import { useMemo } from 'react';
import type { VideoBookmark } from '@/lib/hooks/useDVR';
import { BookmarkTooltip } from './BookmarkTooltip';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Bookmarks created in the last 5 seconds get an entrance animation */
function isRecent(bookmark: VideoBookmark): boolean {
  const created = new Date(bookmark.createdAt).getTime();
  return Date.now() - created < 5000;
}

interface BookmarkMarkersProps {
  bookmarks: VideoBookmark[];
  duration: number;
  currentViewerId?: string;
  onBookmarkClick?: (bookmark: VideoBookmark) => void;
}

export function BookmarkMarkers({
  bookmarks,
  duration,
  currentViewerId,
  onBookmarkClick,
}: BookmarkMarkersProps) {
  // Memoize the recent-check so it doesn't re-run every render for every bookmark
  const recentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of bookmarks) {
      if (isRecent(b)) ids.add(b.id);
    }
    return ids;
  }, [bookmarks]);

  if (duration <= 0 || bookmarks.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      data-testid="bookmark-markers"
    >
      {bookmarks.map((bookmark) => {
        const position = Math.min(
          Math.max((bookmark.timestampSeconds / duration) * 100, 0),
          100,
        );
        const isOwn = bookmark.viewerIdentityId != null && bookmark.viewerIdentityId === currentViewerId;
        const isOrphaned = bookmark.viewerIdentityId == null;
        const showEntrance = recentIds.has(bookmark.id);

        // Color: amber for own, blue for shared, gray for orphaned
        const markerColor = isOwn
          ? 'bg-amber-400'
          : isOrphaned
            ? 'bg-gray-400'
            : 'bg-blue-400';
        const shadowColor = isOwn
          ? 'shadow-amber-400/50'
          : isOrphaned
            ? 'shadow-gray-400/50'
            : 'shadow-blue-400/50';

        return (
          <BookmarkTooltip
            key={bookmark.id}
            label={bookmark.label}
            time={formatTime(bookmark.timestampSeconds)}
            isOwn={isOwn}
            isOrphaned={isOrphaned}
            notes={bookmark.notes}
            onJumpTo={() => onBookmarkClick?.(bookmark)}
          >
            <button
              type="button"
              className="pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group
                min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ left: `${position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onBookmarkClick?.(bookmark);
              }}
              aria-label={`Bookmark: ${bookmark.label} at ${formatTime(bookmark.timestampSeconds)}`}
              data-testid={`bookmark-marker-${bookmark.id}`}
            >
              {/* Tab/flag marker: vertical bar + triangle cap */}
              <span
                className={`
                  flex flex-col items-center
                  transition-transform duration-150
                  group-hover:scale-125
                  ${showEntrance ? 'animate-bounce-in' : ''}
                `}
              >
                {/* Triangle cap */}
                <span
                  className={`
                    w-0 h-0
                    border-l-[4px] border-l-transparent
                    border-r-[4px] border-r-transparent
                    border-b-[5px]
                    ${isOwn
                      ? 'border-b-amber-400'
                      : isOrphaned
                        ? 'border-b-gray-400'
                        : 'border-b-blue-400'
                    }
                  `}
                />
                {/* Vertical bar */}
                <span
                  className={`
                    block w-[3px] h-2.5 rounded-b-sm
                    shadow-md
                    ${markerColor} ${shadowColor}
                  `}
                />
              </span>
            </button>
          </BookmarkTooltip>
        );
      })}

      {/* Entrance animation keyframes (scoped via Tailwind arbitrary) */}
      <style jsx>{`
        @keyframes bounceIn {
          0% { transform: scale(0) translateY(8px); opacity: 0; }
          60% { transform: scale(1.2) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        :global(.animate-bounce-in) {
          animation: bounceIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
