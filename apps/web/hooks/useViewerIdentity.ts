/**
 * useViewerIdentity Hook
 * 
 * Universal viewer identity management for any game/stream type.
 * Handles localStorage persistence and unlock API calls.
 * 
 * Usage:
 * ```tsx
 * const viewer = useViewerIdentity({ gameId });
 * 
 * if (!viewer.isUnlocked) {
 *   return <ViewerUnlockForm onUnlock={viewer.unlock} />;
 * }
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const STORAGE_KEY = 'fieldview_viewer_identity';

interface ViewerIdentity {
  email: string;
  firstName: string;
  lastName: string;
  viewerToken: string;
  gameId: string;
}

interface UnlockData {
  email: string;
  firstName: string;
  lastName: string;
}

interface UseViewerIdentityProps {
  gameId: string | null;
  slug?: string; // For direct streams
}

export function useViewerIdentity({ gameId, slug }: UseViewerIdentityProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!gameId) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const identity: ViewerIdentity = JSON.parse(saved);
        
        // Check if it's for the same game
        if (identity.gameId === gameId && identity.viewerToken) {
          setToken(identity.viewerToken);
          setIsUnlocked(true);
        }
      }
    } catch (err) {
      console.error('Failed to load viewer identity:', err);
    }
  }, [gameId]);

  const unlock = useCallback(async (data: UnlockData) => {
    // Require either gameId or slug to proceed
    if (!gameId && !slug) {
      setError('No game or stream available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use direct stream endpoint if slug is provided, otherwise use game endpoint
      const endpoint = slug 
        ? `${API_URL}/api/public/direct/${slug}/viewer/unlock`
        : `${API_URL}/api/public/games/${gameId}/viewer/unlock`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to unlock' }));
        throw new Error(errorData.error || `Unlock failed: ${response.status}`);
      }

      const result = await response.json();
      const viewerToken = result.viewerToken;

      if (!viewerToken) {
        throw new Error('No viewer token received');
      }

      // Save to localStorage - use gameId if available, otherwise empty string
      const identity: ViewerIdentity = {
        ...data,
        viewerToken,
        gameId: gameId || '', // Allow empty string for slug-only streams
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

      setToken(viewerToken);
      setIsUnlocked(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlock stream';
      setError(message);
      console.error('Unlock error:', err);
      // Re-throw to let the form handle it
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [gameId, slug]);

  return {
    isUnlocked,
    token,
    isLoading,
    error,
    unlock,
  };
}
