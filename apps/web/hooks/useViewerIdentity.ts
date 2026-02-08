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
  viewerId?: string; // viewerIdentityId from API
  // Global auth fields (preserved for cross-stream auth)
  viewerIdentityId?: string;
  registeredAt?: string;
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
  const [viewerId, setViewerId] = useState<string | null>(null); // Add viewerId state
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
          setViewerId(identity.viewerId || null);
          setIsUnlocked(true);
        }
      }
    } catch (err) {
      console.error('Failed to load viewer identity:', err);
    }
  }, [gameId]);

  /**
   * Imperatively set viewer identity from an external source (admin auto-login, anonymous token).
   * Persists to localStorage and updates React state — no page reload needed.
   */
  const setExternalIdentity = useCallback((data: {
    viewerToken: string;
    viewerId: string;
    displayName: string;
    gameId: string;
    email?: string;
  }) => {
    const identity: ViewerIdentity = {
      email: data.email || '',
      firstName: data.displayName,
      lastName: '',
      viewerToken: data.viewerToken,
      gameId: data.gameId,
      viewerId: data.viewerId,
      viewerIdentityId: data.viewerId,
      registeredAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setToken(data.viewerToken);
    setViewerId(data.viewerId);
    setIsUnlocked(true);
  }, []);

  const unlock = useCallback(async (data: UnlockData): Promise<{ viewerId: string | null; viewerToken: string } | void> => {
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
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to unlock' } }));
        // Handle both string errors and structured error objects
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error?.message || `Unlock failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const viewerToken = result.viewerToken;
      const viewerIdFromApi = result.viewer?.id; // Extract viewerId from response

      if (!viewerToken) {
        throw new Error('No viewer token received');
      }

      // Preserve existing global auth fields from localStorage
      let existingGlobalFields: { viewerIdentityId?: string; registeredAt?: string } = {};
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing) {
          const parsed = JSON.parse(existing);
          existingGlobalFields = {
            viewerIdentityId: parsed.viewerIdentityId,
            registeredAt: parsed.registeredAt,
          };
        }
      } catch {
        // Ignore parse errors
      }

      // Save to localStorage - preserve global fields for cross-stream auth
      const identity: ViewerIdentity = {
        ...data,
        viewerToken,
        gameId: gameId || '', // Allow empty string for slug-only streams
        viewerId: viewerIdFromApi, // Save viewerId
        // Preserve or set viewerIdentityId (for cross-stream auth)
        viewerIdentityId: viewerIdFromApi || existingGlobalFields.viewerIdentityId,
        registeredAt: existingGlobalFields.registeredAt || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

      setToken(viewerToken);
      setViewerId(viewerIdFromApi || null);
      setIsUnlocked(true);
      
      // Return the values for immediate use
      return { viewerId: viewerIdFromApi || null, viewerToken };
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
    viewerId,
    isLoading,
    error,
    unlock,
    setExternalIdentity,
  };
}
