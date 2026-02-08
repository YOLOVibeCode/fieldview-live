'use client';

/**
 * BookmarkMarkers - Visual bookmark pins on the video timeline.
 *
 * Renders absolutely-positioned dots at the correct percentage positions
 * along the timeline track. Own bookmarks are amber, shared are blue.
 * Hovering shows a tooltip with label, time, and creator info.
 */

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
        const isOwn = bookmark.viewerIdentityId === currentViewerId;

        return (
          <BookmarkTooltip
            key={bookmark.id}
            label={bookmark.label}
            time={formatTime(bookmark.timestampSeconds)}
            isOwn={isOwn}
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
              {/* Marker dot with 44px touch target */}
              <span
                className={`
                  block w-2.5 h-2.5 rounded-full
                  shadow-md
                  transition-transform duration-150
                  group-hover:scale-150
                  ${isOwn
                    ? 'bg-amber-400 shadow-amber-400/50'
                    : 'bg-blue-400 shadow-blue-400/50'
                  }
                `}
              />
            </button>
          </BookmarkTooltip>
        );
      })}
    </div>
  );
}
