/**
 * useCatalogClock Hook Tests (TDD)
 *
 * Fake timers verify clock direction and period labels without real waits.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCatalogClock } from '../useCatalogClock';

describe('useCatalogClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Soccer (up from 00:00) ──────────────────────────────────────────────

  describe('soccer', () => {
    it('starts at 00:00 and period is 1st Half', () => {
      const { result } = renderHook(() => useCatalogClock('soccer'));

      expect(result.current.time).toBe('00:00');
      expect(result.current.period).toBe('1st Half');
      expect(result.current.clockMode).toBe('up');
      expect(result.current.hideClock).toBe(false);
    });

    it('counts up after start()', () => {
      const { result } = renderHook(() => useCatalogClock('soccer'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(3000);
      });

      // 3 seconds elapsed → 00:03
      expect(result.current.time).toBe('00:03');
    });

    it('pauses at the right value', () => {
      const { result } = renderHook(() => useCatalogClock('soccer'));

      // Each action in its own act so state flushes before the next callback runs
      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { result.current.pause(); });

      expect(result.current.time).toBe('00:05');

      // Advancing time after pause must NOT move the clock
      act(() => { vi.advanceTimersByTime(10000); });

      expect(result.current.time).toBe('00:05');
    });

    it('reset returns to 00:00', () => {
      const { result } = renderHook(() => useCatalogClock('soccer'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(30000);
        result.current.reset();
      });

      expect(result.current.time).toBe('00:00');
    });
  });

  // ─── Football (down from 12:00) ──────────────────────────────────────────

  describe('football', () => {
    it('starts at 12:00 and period is Q1', () => {
      const { result } = renderHook(() => useCatalogClock('football'));

      expect(result.current.time).toBe('12:00');
      expect(result.current.period).toBe('Q1');
      expect(result.current.clockMode).toBe('down');
      expect(result.current.hideClock).toBe(false);
    });

    it('counts down after start()', () => {
      const { result } = renderHook(() => useCatalogClock('football'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(3000);
      });

      // 720 - 3 = 717 → 11:57
      expect(result.current.time).toBe('11:57');
    });

    it('reset returns to 12:00', () => {
      const { result } = renderHook(() => useCatalogClock('football'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(60000);
        result.current.reset();
      });

      expect(result.current.time).toBe('12:00');
    });

    it('does not go below 00:00', () => {
      const { result } = renderHook(() => useCatalogClock('football'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(800 * 1000); // more than 720s
      });

      expect(result.current.time).toBe('00:00');
    });
  });

  // ─── Baseball (no clock) ─────────────────────────────────────────────────

  describe('baseball', () => {
    it('hideClock is true and period starts with Top', () => {
      const { result } = renderHook(() => useCatalogClock('baseball'));

      expect(result.current.hideClock).toBe(true);
      expect(result.current.period).toMatch(/^Top/);
      expect(result.current.clockMode).toBe('none');
    });

    it('time stays 00:00 even after start+advance', () => {
      const { result } = renderHook(() => useCatalogClock('baseball'));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(60000);
      });

      expect(result.current.time).toBe('00:00');
    });
  });

  // ─── Sport switching ─────────────────────────────────────────────────────

  it('switching sport resets the clock', () => {
    const { result, rerender } = renderHook(
      ({ sportId }: { sportId: string }) => useCatalogClock(sportId),
      { initialProps: { sportId: 'football' } }
    );

    // Football should start at 12:00
    expect(result.current.time).toBe('12:00');

    // Start and advance
    act(() => {
      result.current.start();
      vi.advanceTimersByTime(30000);
    });

    // Switch to soccer
    rerender({ sportId: 'soccer' });

    // Soccer should reset to 00:00
    expect(result.current.time).toBe('00:00');
    expect(result.current.clockMode).toBe('up');
  });
});
