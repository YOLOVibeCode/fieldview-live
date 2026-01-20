/**
 * useGlobalViewerAuth Hook
 * 
 * Provides global viewer authentication state that persists across all direct streams.
 * 
 * Features:
 * - Persists to localStorage
 * - Auto-loads on mount
 * - Cross-tab synchronization
 * - Works across all direct stream pages
 * 
 * Usage:
 * ```tsx
 * const { viewerEmail, viewerName, isAuthenticated, setViewerAuth, clearViewerAuth } = useGlobalViewerAuth();
 * 
 * // After successful registration:
 * setViewerAuth({
 *   viewerIdentityId: 'abc123',
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 * });
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fieldview_viewer_identity';

export interface GlobalViewerIdentity {
  viewerIdentityId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  registeredAt: string; // ISO date
}

export interface UseGlobalViewerAuthReturn {
  // State
  viewerIdentityId: string | null;
  viewerEmail: string | null;
  viewerFirstName: string | null;
  viewerLastName: string | null;
  viewerName: string | null; // Combined "firstName lastName" or email
  isAuthenticated: boolean;
  
  // Methods
  setViewerAuth: (identity: Omit<GlobalViewerIdentity, 'registeredAt'>) => void;
  clearViewerAuth: () => void;
  
  // Loading state
  isLoading: boolean;
}

export function useGlobalViewerAuth(): UseGlobalViewerAuthReturn {
  const [identity, setIdentity] = useState<GlobalViewerIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GlobalViewerIdentity;
        setIdentity(parsed);
      }
    } catch (error) {
      console.error('[useGlobalViewerAuth] Failed to load from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;

      if (e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as GlobalViewerIdentity;
          setIdentity(parsed);
        } catch (error) {
          console.error('[useGlobalViewerAuth] Failed to parse storage event:', error);
        }
      } else {
        // Cleared in another tab
        setIdentity(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Set viewer auth - preserve existing per-stream fields
  const setViewerAuth = useCallback((newIdentity: Omit<GlobalViewerIdentity, 'registeredAt'>) => {
    const fullIdentity: GlobalViewerIdentity = {
      ...newIdentity,
      registeredAt: new Date().toISOString(),
    };

    setIdentity(fullIdentity);

    if (typeof window !== 'undefined') {
      try {
        // Preserve existing per-stream fields (viewerToken, gameId) if they exist
        let existingPerStreamFields: Record<string, unknown> = {};
        try {
          const existing = localStorage.getItem(STORAGE_KEY);
          if (existing) {
            const parsed = JSON.parse(existing);
            existingPerStreamFields = {
              viewerToken: parsed.viewerToken,
              gameId: parsed.gameId,
              viewerId: parsed.viewerId,
            };
          }
        } catch {
          // Ignore parse errors
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...existingPerStreamFields,
          ...fullIdentity,
        }));
      } catch (error) {
        console.error('[useGlobalViewerAuth] Failed to save to localStorage:', error);
      }
    }
  }, []);

  // Clear viewer auth
  const clearViewerAuth = useCallback(() => {
    setIdentity(null);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('[useGlobalViewerAuth] Failed to clear localStorage:', error);
      }
    }
  }, []);

  // Compute derived values
  const viewerName = identity
    ? identity.firstName && identity.lastName
      ? `${identity.firstName} ${identity.lastName}`
      : identity.firstName || identity.email
    : null;

  return {
    viewerIdentityId: identity?.viewerIdentityId ?? null,
    viewerEmail: identity?.email ?? null,
    viewerFirstName: identity?.firstName ?? null,
    viewerLastName: identity?.lastName ?? null,
    viewerName,
    isAuthenticated: !!identity,
    setViewerAuth,
    clearViewerAuth,
    isLoading,
  };
}

