'use client';

/**
 * useBookmarkSSE - SSE client for real-time bookmark updates.
 *
 * Connects to /api/bookmarks/stream/:slug and maintains
 * a live list of shared bookmarks. Falls back gracefully
 * when the connection drops (caller should resume polling).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoBookmark } from '@/lib/hooks/useDVR';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const RECONNECT_DELAY_MS = 5000;

interface BookmarkSSEEvent {
  type: 'bookmark_created' | 'bookmark_deleted' | 'bookmark_updated' | 'stream_ended';
  bookmark?: VideoBookmark;
}

interface UseBookmarkSSEOptions {
  slug?: string;
  enabled?: boolean;
  onBookmarkReceived?: (bookmark: VideoBookmark) => void;
}

interface UseBookmarkSSEReturn {
  bookmarks: VideoBookmark[];
  isConnected: boolean;
}

export function useBookmarkSSE({
  slug,
  enabled = true,
  onBookmarkReceived,
}: UseBookmarkSSEOptions): UseBookmarkSSEReturn {
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const onBookmarkReceivedRef = useRef(onBookmarkReceived);

  // Keep callback ref fresh without re-triggering effect
  useEffect(() => {
    onBookmarkReceivedRef.current = onBookmarkReceived;
  }, [onBookmarkReceived]);

  useEffect(() => {
    if (!enabled || !slug) {
      setIsConnected(false);
      return;
    }

    const sseUrl = `${API_URL}/api/bookmarks/stream/${encodeURIComponent(slug)}`;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    function connect() {
      if (disposed) return;

      es = new EventSource(sseUrl);

      // Initial snapshot: replace full list
      es.addEventListener('bookmark_snapshot', (event) => {
        try {
          const data = JSON.parse(event.data) as { bookmarks: VideoBookmark[] };
          setBookmarks(data.bookmarks);
          setIsConnected(true);
        } catch (err) {
          console.error('[Bookmark SSE] snapshot parse error:', err);
        }
      });

      // New bookmark created
      es.addEventListener('bookmark_created', (event) => {
        try {
          const data = JSON.parse(event.data) as BookmarkSSEEvent;
          if (data.bookmark) {
            setBookmarks(prev => {
              // Avoid duplicates (optimistic add may already have it)
              if (prev.some(b => b.id === data.bookmark!.id)) return prev;
              return [...prev, data.bookmark!].sort(
                (a, b) => a.timestampSeconds - b.timestampSeconds,
              );
            });
            onBookmarkReceivedRef.current?.(data.bookmark);
          }
        } catch (err) {
          console.error('[Bookmark SSE] created parse error:', err);
        }
      });

      // Bookmark deleted
      es.addEventListener('bookmark_deleted', (event) => {
        try {
          const data = JSON.parse(event.data) as BookmarkSSEEvent;
          if (data.bookmark) {
            setBookmarks(prev => prev.filter(b => b.id !== data.bookmark!.id));
          }
        } catch (err) {
          console.error('[Bookmark SSE] deleted parse error:', err);
        }
      });

      // Bookmark updated
      es.addEventListener('bookmark_updated', (event) => {
        try {
          const data = JSON.parse(event.data) as BookmarkSSEEvent;
          if (data.bookmark) {
            setBookmarks(prev =>
              prev.map(b => (b.id === data.bookmark!.id ? data.bookmark! : b)),
            );
          }
        } catch (err) {
          console.error('[Bookmark SSE] updated parse error:', err);
        }
      });

      // Stream ended (soft-deleted)
      es.addEventListener('stream_ended', () => {
        setBookmarks([]);
        setIsConnected(false);
        es?.close();
      });

      es.onerror = () => {
        setIsConnected(false);
        es?.close();
        if (!disposed) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      setIsConnected(false);
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled, slug]);

  return { bookmarks, isConnected };
}
