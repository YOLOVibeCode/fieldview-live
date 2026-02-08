import { renderHook, act } from '@testing-library/react';
import { useBookmarkMarkers } from '../useBookmarkMarkers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the useDVR hook that useBookmarkMarkers depends on
const mockFetchBookmarks = vi.fn().mockResolvedValue(undefined);
const mockAddOptimistic = vi.fn();
let mockBookmarks: any[] = [];

vi.mock('@/lib/hooks/useDVR', () => ({
  useListBookmarks: () => ({
    bookmarks: mockBookmarks,
    fetchBookmarks: mockFetchBookmarks,
    addOptimistic: mockAddOptimistic,
    loading: false,
    error: null,
  }),
}));

describe('useBookmarkMarkers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockBookmarks = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return empty bookmarks initially', () => {
    const { result } = renderHook(() =>
      useBookmarkMarkers({ directStreamId: 'stream-1', viewerId: 'v-1' })
    );

    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.ownBookmarks).toEqual([]);
    expect(result.current.sharedBookmarks).toEqual([]);
  });

  it('should fetch bookmarks on mount when enabled', async () => {
    renderHook(() =>
      useBookmarkMarkers({
        directStreamId: 'stream-1',
        viewerId: 'v-1',
        enabled: true,
      })
    );

    expect(mockFetchBookmarks).toHaveBeenCalled();
  });

  it('should not fetch when disabled', () => {
    renderHook(() =>
      useBookmarkMarkers({
        directStreamId: 'stream-1',
        viewerId: 'v-1',
        enabled: false,
      })
    );

    expect(mockFetchBookmarks).not.toHaveBeenCalled();
  });

  it('should not fetch when directStreamId is missing', () => {
    renderHook(() =>
      useBookmarkMarkers({
        viewerId: 'v-1',
        enabled: true,
      })
    );

    expect(mockFetchBookmarks).not.toHaveBeenCalled();
  });

  it('should poll every 30 seconds', async () => {
    renderHook(() =>
      useBookmarkMarkers({
        directStreamId: 'stream-1',
        viewerId: 'v-1',
        enabled: true,
      })
    );

    // Initial call
    const initialCallCount = mockFetchBookmarks.mock.calls.length;

    // After 30 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(mockFetchBookmarks.mock.calls.length).toBe(initialCallCount + 1);

    // After another 30 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(mockFetchBookmarks.mock.calls.length).toBe(initialCallCount + 2);
  });

  it('should split bookmarks into own and shared', () => {
    mockBookmarks = [
      { id: '1', viewerIdentityId: 'v-1', isShared: false, timestampSeconds: 10, label: 'Mine 1', createdAt: '' },
      { id: '2', viewerIdentityId: 'v-2', isShared: true, timestampSeconds: 20, label: 'Shared 1', createdAt: '' },
      { id: '3', viewerIdentityId: 'v-1', isShared: true, timestampSeconds: 30, label: 'Mine 2', createdAt: '' },
      { id: '4', viewerIdentityId: 'v-3', isShared: false, timestampSeconds: 40, label: 'Other private', createdAt: '' },
    ];

    const { result } = renderHook(() =>
      useBookmarkMarkers({
        directStreamId: 'stream-1',
        viewerId: 'v-1',
        enabled: true,
      })
    );

    expect(result.current.ownBookmarks).toHaveLength(2);
    expect(result.current.ownBookmarks.map(b => b.id)).toEqual(['1', '3']);

    expect(result.current.sharedBookmarks).toHaveLength(1);
    expect(result.current.sharedBookmarks[0].id).toBe('2');
  });

  it('should delegate addBookmarkOptimistic to underlying hook', () => {
    const { result } = renderHook(() =>
      useBookmarkMarkers({
        directStreamId: 'stream-1',
        viewerId: 'v-1',
        enabled: true,
      })
    );

    const bookmark = {
      id: 'opt-1',
      viewerIdentityId: 'v-1',
      isShared: false,
      timestampSeconds: 45,
      label: 'Quick Bookmark',
      createdAt: new Date().toISOString(),
    };

    act(() => {
      result.current.addBookmarkOptimistic(bookmark as any);
    });

    expect(mockAddOptimistic).toHaveBeenCalledWith(bookmark);
  });
});
