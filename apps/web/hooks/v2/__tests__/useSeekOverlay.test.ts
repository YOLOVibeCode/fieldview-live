import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeekOverlay } from '../useSeekOverlay';

describe('useSeekOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts hidden', () => {
    const { result } = renderHook(() => useSeekOverlay());
    expect(result.current.isVisible).toBe(false);
  });

  it('show() makes it visible', () => {
    const { result } = renderHook(() => useSeekOverlay());
    act(() => result.current.show());
    expect(result.current.isVisible).toBe(true);
  });

  it('dismiss() hides it', () => {
    const { result } = renderHook(() => useSeekOverlay());
    act(() => result.current.show());
    act(() => result.current.dismiss());
    expect(result.current.isVisible).toBe(false);
  });

  it('auto-dismisses after default 3000ms', async () => {
    const { result } = renderHook(() => useSeekOverlay());
    act(() => result.current.show());
    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('resetAutoDismiss restarts the timer', async () => {
    const { result } = renderHook(() =>
      useSeekOverlay({ autoDismissMs: 3000 })
    );
    act(() => result.current.show());

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    // Reset the timer — should get another full 3000ms
    act(() => result.current.resetAutoDismiss());

    await act(async () => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('long press triggers show after longPressMs', async () => {
    const { result } = renderHook(() =>
      useSeekOverlay({ longPressMs: 2000 })
    );
    const fakeEvent = { button: 0 } as React.PointerEvent;

    act(() => result.current.longPressHandlers.onPointerDown(fakeEvent));
    expect(result.current.isVisible).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.isVisible).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('releasing before longPressMs does not show', async () => {
    const { result } = renderHook(() =>
      useSeekOverlay({ longPressMs: 2000 })
    );
    const fakeEvent = { button: 0 } as React.PointerEvent;

    act(() => result.current.longPressHandlers.onPointerDown(fakeEvent));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    act(() => result.current.longPressHandlers.onPointerUp());

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('dismiss clears auto-dismiss timer', async () => {
    const { result } = renderHook(() =>
      useSeekOverlay({ autoDismissMs: 3000 })
    );
    act(() => result.current.show());
    act(() => result.current.dismiss());
    expect(result.current.isVisible).toBe(false);

    // Advance past the original auto-dismiss time — should stay hidden
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.isVisible).toBe(false);
  });
});
