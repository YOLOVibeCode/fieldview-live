/**
 * useViewportFullscreen Hook
 *
 * The core of the "Lite" viewer fix. Unlike `hooks/v2/useFullscreen.ts` (which
 * fullscreens the video element and is driven by third-party player chrome),
 * this hook ALWAYS targets the wrapper element that contains both the <video>
 * AND the custom overlays. That keeps scoreboard/chat overlays visible in
 * fullscreen because they live inside the fullscreen subtree.
 *
 * Platform behavior:
 * - Desktop / Android / iPad: real Fullscreen API on the wrapper (+ webkit prefix).
 * - iPhone Safari: `element.requestFullscreen` is unsupported, so we use
 *   "fake fullscreen" — a CSS class that pins the wrapper to the viewport
 *   (position:fixed; inset:0) and locks body scroll. We deliberately do NOT call
 *   `video.webkitEnterFullscreen()` because that hands the surface to the native
 *   iOS player and drops every HTML overlay — the exact bug we are fixing.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export interface UseViewportFullscreenReturn {
  /** True when in real OR fake fullscreen. */
  isFullscreen: boolean;
  /** True only when using the CSS fallback (iPhone). */
  isFakeFullscreen: boolean;
  /** True when the real Fullscreen API can be used on an element. */
  isNativeSupported: boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
}

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/** Detect whether the real Fullscreen API can target an arbitrary element. */
function detectNativeSupport(element: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false;
  const el = element as FsElement | null;
  const elementCanRequest = !!(
    el && (el.requestFullscreen || el.webkitRequestFullscreen)
  );
  // On iPhone, document.fullscreenEnabled is typically false and elements have
  // no requestFullscreen — only the <video> has webkitEnterFullscreen.
  return elementCanRequest && !!document.fullscreenEnabled;
}

export function useViewportFullscreen(
  element: HTMLElement | null
): UseViewportFullscreenReturn {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
  const [isNativeSupported, setIsNativeSupported] = useState(false);

  useEffect(() => {
    setIsNativeSupported(detectNativeSupport(element));
  }, [element]);

  // Track real fullscreen changes (only meaningful on supported platforms).
  useEffect(() => {
    const handleChange = () => {
      const doc = document as FsDocument;
      const fsEl = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsNativeFullscreen(!!fsEl && fsEl === element);
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange as EventListener);
    };
  }, [element]);

  const lockBodyScroll = useCallback((lock: boolean) => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = lock ? 'hidden' : '';
  }, []);

  const enter = useCallback(async () => {
    if (!element) return;

    if (isNativeSupported) {
      const el = element as FsElement;
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
        return;
      } catch (err) {
        console.error('[useViewportFullscreen] native enter failed, falling back:', err);
        // Fall through to fake fullscreen.
      }
    }

    // Fake fullscreen (iPhone or native failure).
    setIsFakeFullscreen(true);
    lockBodyScroll(true);
  }, [element, isNativeSupported, lockBodyScroll]);

  const exit = useCallback(async () => {
    if (isFakeFullscreen) {
      setIsFakeFullscreen(false);
      lockBodyScroll(false);
      return;
    }

    const doc = document as FsDocument;
    const active = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (!active) return;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.error('[useViewportFullscreen] exit failed:', err);
    }
  }, [isFakeFullscreen, lockBodyScroll]);

  const isFullscreen = isNativeFullscreen || isFakeFullscreen;

  const toggle = useCallback(async () => {
    if (isFullscreen) {
      await exit();
    } else {
      await enter();
    }
  }, [isFullscreen, enter, exit]);

  // Safety: release body scroll lock on unmount.
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') document.body.style.overflow = '';
    };
  }, []);

  return {
    isFullscreen,
    isFakeFullscreen,
    isNativeSupported,
    enter,
    exit,
    toggle,
  };
}
