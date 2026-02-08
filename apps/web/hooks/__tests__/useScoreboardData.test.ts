import { renderHook, act } from '@testing-library/react';
import { useScoreboardData } from '../useScoreboardData';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockApiResponse = {
  homeTeam: { name: 'Eagles', abbreviation: 'EAG', score: 14, color: '#004C54' },
  awayTeam: { name: 'Hawks', abbreviation: 'HWK', score: 7, color: '#FF0000' },
  period: '2nd',
  time: '5:30',
};

describe('useScoreboardData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    global.fetch = vi.fn() as any;

    const { result } = renderHook(() =>
      useScoreboardData({ slug: null })
    );

    expect(result.current.homeTeam.name).toBe('Home');
    expect(result.current.homeTeam.score).toBe(0);
    expect(result.current.awayTeam.name).toBe('Away');
    expect(result.current.awayTeam.score).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and map API response to TeamData', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    }) as any;

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test-stream', enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.homeTeam.name).toBe('Eagles');
    expect(result.current.homeTeam.abbreviation).toBe('EAG');
    expect(result.current.homeTeam.score).toBe(14);
    expect(result.current.homeTeam.color).toBe('#004C54');
    expect(result.current.awayTeam.name).toBe('Hawks');
    expect(result.current.awayTeam.score).toBe(7);
    expect(result.current.period).toBe('2nd');
    expect(result.current.time).toBe('5:30');
  });

  it('should handle 404 gracefully with defaults', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any;

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'nonexistent', enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Should use defaults, no error
    expect(result.current.homeTeam.name).toBe('Home');
    expect(result.current.error).toBeNull();
  });

  it('should set error on 500 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }) as any;

    const { result } = renderHook(() =>
      useScoreboardData({ slug: 'test', enabled: true })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.error).toContain('Failed to fetch scoreboard');
  });

  it('should poll at specified interval', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockApiResponse,
      };
    }) as any;

    renderHook(() =>
      useScoreboardData({ slug: 'test', enabled: true, pollInterval: 3000 })
    );

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(callCount).toBe(1);

    // After one interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(callCount).toBe(2);
  });

  it('should not fetch when disabled', async () => {
    global.fetch = vi.fn() as any;

    renderHook(() =>
      useScoreboardData({ slug: 'test', enabled: false })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe('updateScore', () => {
    it('should call the correct API endpoint', async () => {
      global.fetch = vi.fn()
        // Initial fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        // updateScore call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        // Refresh fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockApiResponse, homeTeam: { ...mockApiResponse.homeTeam, score: 21 } }),
        }) as any;

      const { result } = renderHook(() =>
        useScoreboardData({
          slug: 'test-stream',
          enabled: true,
          viewerToken: 'token-123',
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await act(async () => {
        await result.current.updateScore('home', 21);
      });

      // Check the updateScore API call
      const calls = (global.fetch as any).mock.calls;
      const updateCall = calls.find((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('viewer-update')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1].method).toBe('POST');
    });

    it('should throw when no slug', async () => {
      const { result } = renderHook(() =>
        useScoreboardData({ slug: null })
      );

      await expect(
        result.current.updateScore('home', 10)
      ).rejects.toThrow('No slug available');
    });

    it('should allow anonymous edit when allowAnonymousEdit is true', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        }) as any;

      const { result } = renderHook(() =>
        useScoreboardData({
          slug: 'test-stream',
          enabled: true,
          allowAnonymousEdit: true,
          // No viewerToken
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Should not throw even without viewerToken
      await act(async () => {
        await result.current.updateScore('away', 14);
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw when no viewerToken and allowAnonymousEdit is false', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      }) as any;

      const { result } = renderHook(() =>
        useScoreboardData({
          slug: 'test-stream',
          enabled: true,
          // no viewerToken, allowAnonymousEdit defaults to false
        })
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await expect(
        result.current.updateScore('home', 10)
      ).rejects.toThrow('Authentication required');
    });
  });
});
