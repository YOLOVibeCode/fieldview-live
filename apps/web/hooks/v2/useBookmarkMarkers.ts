'use client';

/**
 * useBookmarkMarkers - Fetches and manages bookmark markers for the timeline.
 *
 * Uses SSE (useBookmarkSSE) as the primary real-time data source.
 * Falls back to polling every 30s when SSE is disconnected.
 * Supports optimistic insertion when the current user creates a bookmark.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useListBookmarks, type VideoBookmark } from '@/lib/hooks/useDVR';
import { useBookmarkSSE } from './useBookmarkSSE';

const POLL_INTERVAL_MS = 30_000;

interface UseBookmarkMarkersOptions {
  directStreamId?: string;
  viewerId?: string;
  enabled?: boolean;
  onBookmarkReceived?: (bookmark: VideoBookmark) => void;
}

export function useBookmarkMarkers({
  directStreamId,
  viewerId,
  enabled = true,
  onBookmarkReceived,
}: UseBookmarkMarkersOptions) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [optimisticBookmarks, setOptimisticBookmarks] = useState<VideoBookmark[]>([]);

  // SSE: primary real-time source for shared bookmarks
  const sse = useBookmarkSSE({
    slug: directStreamId,
    enabled,
    onBookmarkReceived,
  });

  // Polling: fallback when SSE is disconnected
  const {
    bookmarks: polledBookmarks,
    fetchBookmarks,
    loading,
    error,
  } = useListBookmarks({
    viewerId,
    directStreamId,
    includeShared: true,
  });

  // Initial fetch when enabled (needed regardless of SSE for own bookmarks)
  useEffect(() => {
    if (!enabled || !directStreamId) return;
    void fetchBookmarks();
  }, [enabled, directStreamId, fetchBookmarks]);

  // Poll only when SSE is disconnected
  useEffect(() => {
    if (!enabled || !directStreamId) return;

    // Don't poll if SSE is handling real-time updates
    if (sse.isConnected) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      void fetchBookmarks();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, directStreamId, fetchBookmarks, sse.isConnected]);

  // Merge SSE bookmarks with polled bookmarks.
  // SSE provides shared bookmarks; polled provides own + shared.
  // When SSE is connected, use SSE for shared and polled for own-only.
  // When SSE is disconnected, use polled for everything.
  const bookmarks = (() => {
    if (sse.isConnected) {
      // Own bookmarks from polled (not shared, just this viewer's)
      const ownFromPoll = polledBookmarks.filter(
        b => b.viewerIdentityId != null && b.viewerIdentityId === viewerId && !b.isShared,
      );
      // Merge own private with SSE shared, plus optimistic adds
      const merged = new Map<string, VideoBookmark>();
      for (const b of ownFromPoll) merged.set(b.id, b);
      for (const b of sse.bookmarks) merged.set(b.id, b);
      for (const b of optimisticBookmarks) merged.set(b.id, b);
      return Array.from(merged.values()).sort(
        (a, b) => a.timestampSeconds - b.timestampSeconds,
      );
    }
    // SSE disconnected: use polled data + optimistic adds
    const merged = new Map<string, VideoBookmark>();
    for (const b of polledBookmarks) merged.set(b.id, b);
    for (const b of optimisticBookmarks) merged.set(b.id, b);
    return Array.from(merged.values()).sort(
      (a, b) => a.timestampSeconds - b.timestampSeconds,
    );
  })();

  // Derived: split into own vs shared (handles null viewerIdentityId)
  const ownBookmarks = bookmarks.filter(
    b => b.viewerIdentityId != null && b.viewerIdentityId === viewerId,
  );
  const sharedBookmarks = bookmarks.filter(
    b => b.viewerIdentityId !== viewerId || b.viewerIdentityId == null,
  );

  // Add a bookmark optimistically (for instant marker display after creation)
  const addBookmarkOptimistic = useCallback(
    (bookmark: VideoBookmark) => {
      setOptimisticBookmarks(prev => {
        if (prev.some(b => b.id === bookmark.id)) return prev;
        return [...prev, bookmark];
      });
      // Clear optimistic after next poll cycle picks it up
      setTimeout(() => {
        setOptimisticBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
      }, POLL_INTERVAL_MS + 5000);
    },
    [],
  );

  return {
    bookmarks,
    ownBookmarks,
    sharedBookmarks,
    addBookmarkOptimistic,
    refetch: fetchBookmarks,
    loading,
    error,
    sseConnected: sse.isConnected,
  };
}
