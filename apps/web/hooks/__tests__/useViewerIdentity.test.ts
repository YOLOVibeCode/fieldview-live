import { renderHook, act } from '@testing-library/react';
import { useViewerIdentity } from '../useViewerIdentity';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const STORAGE_KEY = 'fieldview_viewer_identity';

// Simple localStorage mock
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

describe('useViewerIdentity', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize as not unlocked', () => {
      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test' })
      );
      expect(result.current.isUnlocked).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.viewerId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load saved identity from localStorage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          viewerToken: 'saved-token',
          gameId: 'game-1',
          viewerId: 'viewer-1',
        })
      );

      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test' })
      );

      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.token).toBe('saved-token');
      expect(result.current.viewerId).toBe('viewer-1');
    });

    it('should NOT load identity for a different gameId', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          viewerToken: 'saved-token',
          gameId: 'game-1',
          viewerId: 'viewer-1',
        })
      );

      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-2', slug: 'test2' })
      );

      expect(result.current.isUnlocked).toBe(false);
      expect(result.current.token).toBeNull();
    });

    it('should not load identity when gameId is null', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          viewerToken: 'saved-token',
          gameId: 'game-1',
          viewerId: 'viewer-1',
        })
      );

      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: null, slug: 'test' })
      );

      expect(result.current.isUnlocked).toBe(false);
    });
  });

  describe('setExternalIdentity', () => {
    it('should set viewer state and persist to localStorage', () => {
      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test' })
      );

      act(() => {
        result.current.setExternalIdentity({
          viewerToken: 'ext-token-123',
          viewerId: 'ext-viewer-1',
          displayName: 'Admin User',
          gameId: 'game-1',
          email: 'admin@test.fieldview.live',
        });
      });

      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.token).toBe('ext-token-123');
      expect(result.current.viewerId).toBe('ext-viewer-1');

      // Verify localStorage was updated
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.viewerToken).toBe('ext-token-123');
      expect(saved.viewerId).toBe('ext-viewer-1');
      expect(saved.gameId).toBe('game-1');
      expect(saved.email).toBe('admin@test.fieldview.live');
    });

    it('should work without email', () => {
      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test' })
      );

      act(() => {
        result.current.setExternalIdentity({
          viewerToken: 'anon-token',
          viewerId: 'anon-viewer-1',
          displayName: 'Guest 1234',
          gameId: 'game-1',
        });
      });

      expect(result.current.isUnlocked).toBe(true);
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(saved.email).toBe('');
    });
  });

  describe('unlock', () => {
    it('should set error when no gameId or slug', async () => {
      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: null })
      );

      await act(async () => {
        await result.current.unlock({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }).catch(() => {/* expected */});
      });

      expect(result.current.error).toBe('No game or stream available');
    });

    it('should call API and set state on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          viewerToken: 'new-token',
          viewer: { id: 'v-123' },
          gameId: 'game-1',
        }),
      }) as any;

      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test-slug' })
      );

      await act(async () => {
        await result.current.unlock({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        });
      });

      expect(result.current.isUnlocked).toBe(true);
      expect(result.current.token).toBe('new-token');
      expect(result.current.viewerId).toBe('v-123');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Stream not found' }),
      }) as any;

      const { result } = renderHook(() =>
        useViewerIdentity({ gameId: 'game-1', slug: 'test' })
      );

      await act(async () => {
        try {
          await result.current.unlock({
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          });
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Stream not found');
      expect(result.current.isUnlocked).toBe(false);
    });
  });
});
