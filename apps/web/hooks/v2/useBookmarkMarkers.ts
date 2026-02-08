'use client';

/**
 * useBookmarkMarkers - Fetches and manages bookmark markers for the timeline.
 *
 * Combines the current viewer's bookmarks with shared bookmarks from others.
 * Polls every 30s for new shared bookmarks.
 * Supports optimistic insertion when the current user creates a bookmark.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useListBookmarks, type VideoBookmark } from '@/lib/hooks/useDVR';

const POLL_INTERVAL_MS = 30_000;

interface UseBookmarkMarkersOptions {
  directStreamId?: string;
  viewerId?: string;
  enabled?: boolean;
}

export function useBookmarkMarkers({
  directStreamId,
  viewerId,
  enabled = true,
}: UseBookmarkMarkersOptions) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    bookmarks,
    fetchBookmarks,
    addOptimistic,
    loading,
    error,
  } = useListBookmarks({
    viewerId,
    directStreamId,
    includeShared: true,
  });

  // Initial fetch when enabled
  useEffect(() => {
    if (!enabled || !directStreamId) return;
    void fetchBookmarks();
  }, [enabled, directStreamId, fetchBookmarks]);

  // Poll for new shared bookmarks
  useEffect(() => {
    if (!enabled || !directStreamId) return;

    pollRef.current = setInterval(() => {
      void fetchBookmarks();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, directStreamId, fetchBookmarks]);

  // Derived: split into own vs shared
  const ownBookmarks = bookmarks.filter(b => b.viewerIdentityId === viewerId);
  const sharedBookmarks = bookmarks.filter(
    b => b.viewerIdentityId !== viewerId && b.isShared,
  );

  // Add a bookmark optimistically (for instant marker display after creation)
  const addBookmarkOptimistic = useCallback(
    (bookmark: VideoBookmark) => {
      addOptimistic(bookmark);
    },
    [addOptimistic],
  );

  return {
    bookmarks,
    ownBookmarks,
    sharedBookmarks,
    addBookmarkOptimistic,
    refetch: fetchBookmarks,
    loading,
    error,
  };
}
