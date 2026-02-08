import { renderHook, act, waitFor } from '@testing-library/react';
import { useViewerCount } from '../useViewerCount';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useViewerCount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return 0 initially', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as any;

    const { result } = renderHook(() =>
      useViewerCount({ slug: 'test-stream' })
    );
    expect(result.current.count).toBe(0);
  });

  it('should fetch count from API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 5 }),
    }) as any;

    const { result } = renderHook(() =>
      useViewerCount({ slug: 'test-stream' })
    );

    // Flush the initial fetch (use small advance, not runAll which loops on setInterval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.count).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/direct/test-stream/viewer-count')
    );
  });

  it('should poll at the specified interval', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({ count: callCount }),
      };
    }) as any;

    renderHook(() =>
      useViewerCount({ slug: 'test-stream', pollInterval: 5000 })
    );

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(callCount).toBe(1);

    // After one interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(callCount).toBe(2);

    // After another interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(callCount).toBe(3);
  });

  it('should not fetch when disabled', async () => {
    global.fetch = vi.fn() as any;

    renderHook(() =>
      useViewerCount({ slug: 'test-stream', enabled: false })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not fetch when slug is null', async () => {
    global.fetch = vi.fn() as any;

    renderHook(() =>
      useViewerCount({ slug: null })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

    const { result } = renderHook(() =>
      useViewerCount({ slug: 'test-stream' })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Should not crash, count stays at 0
    expect(result.current.count).toBe(0);
  });

  it('should handle non-ok response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as any;

    const { result } = renderHook(() =>
      useViewerCount({ slug: 'test-stream' })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.count).toBe(0);
  });
});
