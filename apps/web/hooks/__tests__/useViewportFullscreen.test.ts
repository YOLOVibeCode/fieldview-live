/**
 * useViewportFullscreen Hook Tests
 *
 * The critical proof: on supported platforms we use the real Fullscreen API on
 * the WRAPPER; on iPhone (no element.requestFullscreen) we fall back to fake
 * fullscreen and never touch the native video fullscreen.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportFullscreen } from '../useViewportFullscreen';

describe('useViewportFullscreen', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    document.body.style.overflow = '';
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.removeChild(el);
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  describe('native (desktop / Android / iPad)', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true,
      });
      el.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    });

    it('reports native support', () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      expect(result.current.isNativeSupported).toBe(true);
    });

    it('calls requestFullscreen on the wrapper element', async () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      await act(async () => {
        await result.current.enter();
      });
      expect(el.requestFullscreen).toHaveBeenCalledTimes(1);
      expect(result.current.isFakeFullscreen).toBe(false);
    });

    it('does not lock body scroll in native mode', async () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      await act(async () => {
        await result.current.enter();
      });
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('iPhone (no element.requestFullscreen)', () => {
    beforeEach(() => {
      // iPhone Safari: Fullscreen API on elements is unavailable.
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        writable: true,
        configurable: true,
      });
      // No el.requestFullscreen / el.webkitRequestFullscreen defined.
    });

    it('reports no native support', () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      expect(result.current.isNativeSupported).toBe(false);
    });

    it('uses fake fullscreen and locks body scroll', async () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      await act(async () => {
        await result.current.enter();
      });
      expect(result.current.isFakeFullscreen).toBe(true);
      expect(result.current.isFullscreen).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('exits fake fullscreen and restores body scroll', async () => {
      const { result } = renderHook(() => useViewportFullscreen(el));
      await act(async () => {
        await result.current.enter();
      });
      await act(async () => {
        await result.current.exit();
      });
      expect(result.current.isFakeFullscreen).toBe(false);
      expect(result.current.isFullscreen).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('never calls native video fullscreen (the bug we are fixing)', async () => {
      const webkitEnterFullscreen = vi.fn();
      // Even if a video offered native fullscreen, the hook must not use it.
      const video = document.createElement('video') as HTMLVideoElement & {
        webkitEnterFullscreen: () => void;
      };
      video.webkitEnterFullscreen = webkitEnterFullscreen;

      const { result } = renderHook(() => useViewportFullscreen(el));
      await act(async () => {
        await result.current.toggle();
      });
      expect(webkitEnterFullscreen).not.toHaveBeenCalled();
      expect(result.current.isFakeFullscreen).toBe(true);
    });
  });
});
