/**
 * @vitest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGlobalViewerAuth, GlobalViewerIdentity } from '../useGlobalViewerAuth';

const STORAGE_KEY = 'fieldview_viewer_identity';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useGlobalViewerAuth', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should start with no authentication', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.viewerIdentityId).toBeNull();
      expect(result.current.viewerEmail).toBeNull();
      expect(result.current.viewerName).toBeNull();
    });

    it('should load existing identity from localStorage', () => {
      const mockIdentity: GlobalViewerIdentity = {
        viewerIdentityId: 'viewer-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        registeredAt: '2026-01-15T00:00:00.000Z',
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockIdentity));

      const { result } = renderHook(() => useGlobalViewerAuth());

      // Wait for loading to complete
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.viewerIdentityId).toBe('viewer-123');
      expect(result.current.viewerEmail).toBe('test@example.com');
      expect(result.current.viewerFirstName).toBe('John');
      expect(result.current.viewerLastName).toBe('Doe');
      expect(result.current.viewerName).toBe('John Doe');
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      const { result } = renderHook(() => useGlobalViewerAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.viewerIdentityId).toBeNull();
    });
  });

  describe('setViewerAuth', () => {
    it('should set viewer authentication', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.viewerIdentityId).toBe('viewer-123');
      expect(result.current.viewerEmail).toBe('test@example.com');
      expect(result.current.viewerName).toBe('Jane Smith');
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
          firstName: 'Jane',
        });
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!) as GlobalViewerIdentity;
      expect(parsed.viewerIdentityId).toBe('viewer-123');
      expect(parsed.email).toBe('test@example.com');
      expect(parsed.firstName).toBe('Jane');
      expect(parsed.registeredAt).toBeTruthy();
    });

    it('should handle viewer with only email', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
        });
      });

      expect(result.current.viewerName).toBe('test@example.com');
    });

    it('should handle viewer with only firstName', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
          firstName: 'John',
        });
      });

      expect(result.current.viewerName).toBe('John');
    });
  });

  describe('clearViewerAuth', () => {
    it('should clear viewer authentication', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.clearViewerAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.viewerIdentityId).toBeNull();
      expect(result.current.viewerEmail).toBeNull();
    });

    it('should remove from localStorage', () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
        });
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

      act(() => {
        result.current.clearViewerAuth();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should sync when storage changes in another tab', async () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockIdentity: GlobalViewerIdentity = {
        viewerIdentityId: 'viewer-456',
        email: 'new@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        registeredAt: '2026-01-15T00:00:00.000Z',
      };

      // Simulate storage event from another tab
      act(() => {
        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(mockIdentity));
        
        // Manually dispatch storage event
        window.dispatchEvent(
          Object.assign(new Event('storage'), {
            key: STORAGE_KEY,
            newValue: JSON.stringify(mockIdentity),
            oldValue: null,
            storageArea: localStorage,
          })
        );
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.viewerIdentityId).toBe('viewer-456');
        expect(result.current.viewerEmail).toBe('new@example.com');
      });
    });

    it('should clear when storage is cleared in another tab', async () => {
      const { result } = renderHook(() => useGlobalViewerAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setViewerAuth({
          viewerIdentityId: 'viewer-123',
          email: 'test@example.com',
        });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate storage clear from another tab
      act(() => {
        localStorageMock.removeItem(STORAGE_KEY);
        
        // Manually dispatch storage event
        window.dispatchEvent(
          Object.assign(new Event('storage'), {
            key: STORAGE_KEY,
            newValue: null,
            oldValue: JSON.stringify({ viewerIdentityId: 'viewer-123' }),
            storageArea: localStorage,
          })
        );
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });
});

