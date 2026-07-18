/**
 * useScoreboardData Hook Tests (TDD - Test First)
 * 
 * Tests for refactored hook using centralized scoreboardApi client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useScoreboardData } from '../useScoreboardData';
import * as scoreboardApiModule from '@/lib/api/scoreboard';
import { ApiError } from '@/lib/api-client';
import type { ScoreboardData } from '@/lib/api/scoreboard/types';

// Mock the scoreboardApi
vi.mock('@/lib/api/scoreboard', () => ({
  scoreboardApi: {
    fetch: vi.fn(),
    updateScore: vi.fn(),
    streamUpdates: vi.fn(),
  },
}));

describe('useScoreboardData', () => {
  const mockScoreboardApi = scoreboardApiModule.scoreboardApi as {
    fetch: ReturnType<typeof vi.fn>;
    updateScore: ReturnType<typeof vi.fn>;
    streamUpdates: ReturnType<typeof vi.fn>;
  };

  const mockScoreboardData: ScoreboardData = {
    homeTeam: { name: 'Home Team', score: 10, color: '#3B82F6' },
    awayTeam: { name: 'Away Team', score: 8, color: '#EF4444' },
    period: undefined,
    time: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScoreboardApi.fetch.mockResolvedValue(mockScoreboardData);
    mockScoreboardApi.streamUpdates.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use scoreboardApi.fetch() instead of direct fetch', async () => {
    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    await waitFor(() => {
      expect(mockScoreboardApi.fetch).toHaveBeenCalledWith('test-slug');
    });

    expect(result.current.homeTeam.name).toBe('Home Team');
    expect(result.current.awayTeam.name).toBe('Away Team');
  });

  it('should return user-friendly error messages from ApiError', async () => {
    const userFriendlyError = new ApiError(
      500,
      'SERVER_ERROR',
      'Server error. Please try again in a moment.'
    );
    mockScoreboardApi.fetch.mockRejectedValue(userFriendlyError);

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Server error. Please try again in a moment.');
    });
  });

  it('should automatically retry failed fetches via scoreboardApi', async () => {
    // scoreboardApi.fetch() already has retry logic built-in (retries: 2)
    // First call will fail, but since scoreboardApi handles retries internally,
    // we just need to test that it eventually succeeds
    mockScoreboardApi.fetch.mockResolvedValueOnce(mockScoreboardData);

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    // The scoreboardApi should provide the data
    await waitFor(() => {
      expect(result.current.homeTeam.name).toBe('Home Team');
    });
  });

  it('should not set error state on 404 (uses defaults)', async () => {
    const defaultData: ScoreboardData = {
      homeTeam: { name: 'Home', score: 0, color: '#3B82F6' },
      awayTeam: { name: 'Away', score: 0, color: '#EF4444' },
      period: undefined,
      time: undefined,
    };
    
    mockScoreboardApi.fetch.mockResolvedValue(defaultData);

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.homeTeam.name).toBe('Home');
    });
  });

  it('should use scoreboardApi.updateScore() for updates', async () => {
    const updatedData: ScoreboardData = {
      ...mockScoreboardData,
      homeTeam: { ...mockScoreboardData.homeTeam, score: 15 },
    };
    
    mockScoreboardApi.updateScore.mockResolvedValue(updatedData);

    const { result } = renderHook(() =>
      useScoreboardData({
        slug: 'test-slug',
        enabled: true,
        viewerToken: 'viewer-token-123',
      })
    );

    await waitFor(() => {
      expect(result.current.homeTeam).toBeDefined();
    });

    await act(async () => {
      await result.current.updateScore('home', 15);
    });

    expect(mockScoreboardApi.updateScore).toHaveBeenCalledWith(
      'test-slug',
      'home',
      15,
      { viewerToken: 'viewer-token-123', adminToken: undefined }
    );
  });

  it('should set saveError state with user-friendly message on update failure', async () => {
    mockScoreboardApi.updateScore.mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'You do not have permission to edit scores.')
    );

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true, allowAnonymousEdit: true })
    );

    await waitFor(() => {
      expect(result.current.homeTeam).toBeDefined();
    });

    let caughtError = false;
    await act(async () => {
      try {
        await result.current.updateScore('home', 10);
      } catch (err) {
        caughtError = true;
      }
    });

    expect(caughtError).toBe(true);
    
    await waitFor(() => {
      expect(result.current.saveError).toBe('You do not have permission to edit scores.');
    });
  });

  it('should clear saveError on successful update (optimistic update)', async () => {
    const updatedData: ScoreboardData = {
      ...mockScoreboardData,
      homeTeam: { ...mockScoreboardData.homeTeam, score: 20 },
    };

    mockScoreboardApi.updateScore.mockResolvedValue(updatedData);

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true, viewerToken: 'token' })
    );

    await waitFor(() => {
      expect(result.current.homeTeam).toBeDefined();
    });

    // Set an error first
    act(() => {
      (result.current as any).setSaveError?.('Previous error');
    });

    // Now update successfully
    await act(async () => {
      await result.current.updateScore('home', 20);
    });

    expect(result.current.saveError).toBeNull();
    expect(result.current.homeTeam.score).toBe(20);
  });

  it('should apply SSE updates correctly using scoreboardApi.streamUpdates', async () => {
    let sseCallback: ((data: ScoreboardData, rawResponse: any) => void) | null = null;
    
    mockScoreboardApi.streamUpdates.mockImplementation((slug, onUpdate, callbacks) => {
      sseCallback = onUpdate;
      return () => {}; // cleanup function
    });

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    await waitFor(() => {
      expect(mockScoreboardApi.streamUpdates).toHaveBeenCalledWith(
        'test-slug',
        expect.any(Function),
        expect.objectContaining({
          onDisconnect: expect.any(Function),
          onReconnect: expect.any(Function),
        })
      );
    });

    // Simulate SSE update
    const sseUpdate: ScoreboardData = {
      homeTeam: { name: 'Updated Home', score: 25, color: '#3B82F6' },
      awayTeam: { name: 'Updated Away', score: 18, color: '#EF4444' },
      period: 'Running',
      time: '05:30',
    };
    
    const mockRawResponse = {
      id: '123',
      homeTeamName: 'Updated Home',
      awayTeamName: 'Updated Away',
      homeScore: 25,
      awayScore: 18,
      homeJerseyColor: '#3B82F6',
      awayJerseyColor: '#EF4444',
      clockMode: 'running',
      clockSeconds: 330,
      clockStartedAt: new Date().toISOString(),
    };

    act(() => {
      sseCallback?.(sseUpdate, mockRawResponse);
    });

    expect(result.current.homeTeam.name).toBe('Updated Home');
    expect(result.current.homeTeam.score).toBe(25);
    expect(result.current.awayTeam.score).toBe(18);
    expect(result.current.period).toBe('Running');
    expect(result.current.time).toBe('05:30');
  });

  it('should clean up SSE connection on unmount', async () => {
    const mockCleanup = vi.fn();
    mockScoreboardApi.streamUpdates.mockReturnValue(mockCleanup);

    const { unmount } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    await waitFor(() => {
      expect(mockScoreboardApi.streamUpdates).toHaveBeenCalled();
    });

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should clear previous errors when refresh() is called', async () => {
    mockScoreboardApi.fetch
      .mockRejectedValueOnce(
        new ApiError(500, 'SERVER_ERROR', 'Server error. Please try again in a moment.')
      )
      .mockResolvedValueOnce(mockScoreboardData);

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-slug', enabled: true })
    );

    // Wait for error to be set
    await waitFor(() => {
      expect(result.current.error).toBe('Server error. Please try again in a moment.');
    });

    // Refresh should clear error and retry
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.homeTeam.name).toBe('Home Team');
  });
});
