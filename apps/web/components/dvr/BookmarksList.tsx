/**
 * BookmarksList Component
 *
 * Display and manage user's bookmarks
 */

'use client';

import { useState, useEffect } from 'react';
import { useListBookmarks, useDeleteBookmark, useCreateClipFromBookmark, type VideoBookmark } from '@/lib/hooks/useDVR';

interface BookmarksListProps {
  viewerId?: string;
  gameId?: string;
  directStreamId?: string;
  includeShared?: boolean;
  onSeek?: (timeSeconds: number) => void;
  className?: string;
}

export function BookmarksList({
  viewerId,
  gameId,
  directStreamId,
  includeShared,
  onSeek,
  className = '',
}: BookmarksListProps) {
  const { bookmarks, fetchBookmarks, loading, error } = useListBookmarks({
    viewerId,
    gameId,
    directStreamId,
    includeShared,
  });
  const { deleteBookmark, loading: deleting } = useDeleteBookmark();
  const { createClipFromBookmark, loading: creatingClip } = useCreateClipFromBookmark();

  // Inline confirm state (replaces native confirm())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Inline clip feedback (replaces native alert())
  const [clipFeedback, setClipFeedback] = useState<{ bookmarkId: string; message: string; isError: boolean } | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Auto-hide clip feedback after 3s
  useEffect(() => {
    if (!clipFeedback) return;
    const timer = setTimeout(() => setClipFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [clipFeedback]);

  const handleDelete = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId);
      setConfirmDeleteId(null);
      await fetchBookmarks();
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const handleCreateClip = async (bookmark: VideoBookmark) => {
    try {
      const clip = await createClipFromBookmark(bookmark.id, {
        title: bookmark.label,
        bufferSeconds: 5,
        isPublic: bookmark.isShared,
      });
      setClipFeedback({ bookmarkId: bookmark.id, message: `Clip created (${clip.id.slice(0, 8)}...)`, isError: false });
    } catch (err) {
      console.error('Failed to create clip:', err);
      setClipFeedback({ bookmarkId: bookmark.id, message: 'Failed to create clip', isError: true });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div data-testid="loading-bookmarks" className={`p-4 ${className}`}>
        <p className="text-gray-400">Loading bookmarks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="error-bookmarks" className={`p-4 ${className}`}>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div data-testid="empty-bookmarks" className={`p-4 text-center ${className}`}>
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-600"
          fill="none"
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
        <p className="text-gray-400 mb-2">No bookmarks yet</p>
        <p className="text-gray-500 text-sm">Click the bookmark button to save moments</p>
      </div>
    );
  }

  return (
    <div data-testid="list-bookmarks" className={`p-4 ${className}`}>
      <h3 className="text-xl font-bold text-white mb-4">
        Bookmarks ({bookmarks.length})
      </h3>

      <div className="space-y-3">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            data-testid={`bookmark-${bookmark.id}`}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-amber-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">{bookmark.label}</h4>
                <p className="text-amber-400 text-sm font-mono">
                  {formatTime(bookmark.timestampSeconds)}
                </p>
                {bookmark.notes && (
                  <p className="text-gray-400 text-sm mt-2">{bookmark.notes}</p>
                )}
              </div>

              {bookmark.isShared && (
                <span className="ml-2 px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
                  Public
                </span>
              )}
            </div>

            {/* Clip feedback inline */}
            {clipFeedback?.bookmarkId === bookmark.id && (
              <div
                className={`text-xs px-2 py-1 rounded mb-2 ${
                  clipFeedback.isError
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-green-900/50 text-green-300'
                }`}
                data-testid={`clip-feedback-${bookmark.id}`}
              >
                {clipFeedback.message}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {onSeek && (
                <button
                  data-testid={`btn-seek-${bookmark.id}`}
                  onClick={() => onSeek(bookmark.timestampSeconds)}
                  className="px-3 py-1 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors"
                >
                  Jump to
                </button>
              )}

              <button
                data-testid={`btn-create-clip-${bookmark.id}`}
                onClick={() => handleCreateClip(bookmark)}
                disabled={creatingClip}
                className="px-3 py-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                {creatingClip ? 'Creating...' : 'Create Clip'}
              </button>

              {confirmDeleteId === bookmark.id ? (
                /* Inline confirm/cancel (replaces native confirm()) */
                <div className="flex gap-1 ml-auto" data-testid={`confirm-delete-${bookmark.id}`}>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 min-h-[44px] bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                  >
                    No
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id)}
                    disabled={deleting}
                    className="px-2 py-1 min-h-[44px] bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                    data-testid={`btn-confirm-delete-${bookmark.id}`}
                  >
                    {deleting ? '...' : 'Yes'}
                  </button>
                </div>
              ) : (
                <button
                  data-testid={`btn-delete-${bookmark.id}`}
                  onClick={() => setConfirmDeleteId(bookmark.id)}
                  disabled={deleting}
                  className="px-3 py-1 min-h-[44px] bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors ml-auto"
                >
                  Delete
                </button>
              )}
            </div>

            {bookmark.clipId && (
              <div className="mt-2 text-xs text-green-400">
                Clip created
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
