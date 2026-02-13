/**
 * DVR API Client Hooks
 * 
 * React hooks for interacting with DVR API endpoints
 */

import { useState, useCallback } from 'react';

// ========================================
// Types
// ========================================

export interface VideoClip {
  id: string;
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  providerName: string;
  providerClipId: string;
  title: string;
  description?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  playbackUrl?: string;
  thumbnailUrl?: string;
  status: string;
  isPublic: boolean;
  viewCount: number;
  shareCount: number;
  createdAt: string;
}

export interface VideoBookmark {
  id: string;
  gameId?: string;
  directStreamId?: string;
  clipId?: string;
  viewerIdentityId?: string | null;
  timestampSeconds: number;
  label: string;
  notes?: string;
  isShared: boolean;
  bufferSeconds?: number;
  createdAt: string;
}

export interface CreateClipInput {
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  providerName: 'mock' | 'mux' | 'cloudflare';
  recordingId: string;
  title: string;
  description?: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  isPublic?: boolean;
}

export interface CreateBookmarkInput {
  gameId?: string;
  directStreamId?: string;
  viewerIdentityId: string;
  timestampSeconds: number;
  label: string;
  notes?: string;
  isShared?: boolean;
  bufferSeconds?: number;
}

// ========================================
// API Client Utilities
// ========================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ========================================
// Clips Hooks
// ========================================

export function useCreateClip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createClip = useCallback(async (input: CreateClipInput): Promise<VideoClip> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ clip: VideoClip }>('/api/clips', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return result.clip;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createClip, loading, error };
}

export function useCreateClipFromBookmark() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createClipFromBookmark = useCallback(
    async (bookmarkId: string, options?: { title?: string; bufferSeconds?: number; isPublic?: boolean }): Promise<VideoClip> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<{ clip: VideoClip }>('/api/clips/from-bookmark', {
          method: 'POST',
          body: JSON.stringify({ bookmarkId, ...options }),
        });
        return result.clip;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createClipFromBookmark, loading, error };
}

export function useListClips(options?: {
  gameId?: string;
  directStreamId?: string;
  directStreamSlug?: string;
  publicOnly?: boolean;
}) {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.gameId) params.append('gameId', options.gameId);
      if (options?.directStreamId) params.append('directStreamId', options.directStreamId);
      if (options?.directStreamSlug) params.append('directStreamSlug', options.directStreamSlug);
      if (options?.publicOnly) params.append('publicOnly', 'true');

      const result = await apiRequest<{ clips: VideoClip[] }>(
        `/api/clips?${params.toString()}`
      );
      setClips(result.clips);
      return result.clips;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options?.gameId, options?.directStreamId, options?.directStreamSlug, options?.publicOnly]);

  return { clips, fetchClips, loading, error };
}

export function useTrackClipView() {
  const trackView = useCallback(async (clipId: string): Promise<void> => {
    await apiRequest(`/api/clips/${clipId}/view`, {
      method: 'POST',
    });
  }, []);

  return { trackView };
}

export function useTrackClipShare() {
  const trackShare = useCallback(async (clipId: string): Promise<void> => {
    await apiRequest(`/api/clips/${clipId}/share`, {
      method: 'POST',
    });
  }, []);

  return { trackShare };
}

// ========================================
// Bookmarks Hooks
// ========================================

export function useCreateBookmark() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBookmark = useCallback(async (input: CreateBookmarkInput): Promise<VideoBookmark> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ bookmark: VideoBookmark }>('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return result.bookmark;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createBookmark, loading, error };
}

export function useListBookmarks(options?: {
  viewerId?: string;
  gameId?: string;
  directStreamId?: string;
  includeShared?: boolean;
}) {
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.viewerId) params.append('viewerId', options.viewerId);
      if (options?.gameId) params.append('gameId', options.gameId);
      if (options?.directStreamId) params.append('directStreamId', options.directStreamId);
      if (options?.includeShared) params.append('includeShared', 'true');

      const result = await apiRequest<{ bookmarks: VideoBookmark[] }>(
        `/api/bookmarks?${params.toString()}`
      );
      setBookmarks(result.bookmarks);
      return result.bookmarks;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options?.viewerId, options?.gameId, options?.directStreamId, options?.includeShared]);

  // Allow optimistic bookmark insertion (for instant marker display)
  const addOptimistic = useCallback((bookmark: VideoBookmark) => {
    setBookmarks(prev => [...prev, bookmark].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
  }, []);

  return { bookmarks, fetchBookmarks, addOptimistic, loading, error };
}

export function useUpdateBookmark() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBookmark = useCallback(
    async (
      bookmarkId: string,
      updates: { label?: string; notes?: string; isShared?: boolean }
    ): Promise<VideoBookmark> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<{ bookmark: VideoBookmark }>(
          `/api/bookmarks/${bookmarkId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(updates),
          }
        );
        return result.bookmark;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { updateBookmark, loading, error };
}

export function useDeleteBookmark() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteBookmark = useCallback(async (bookmarkId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteBookmark, loading, error };
}

