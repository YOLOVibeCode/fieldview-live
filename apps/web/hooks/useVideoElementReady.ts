'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Fires onReady when a descendant <video> can play, even if Vidstack/Mux
 * never emit onStatusChange('playing').
 */
export function useVideoElementReady(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onReady: () => void,
  sourceKey?: string | null,
): void {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (!enabled) return;

    const root = containerRef.current;
    if (!root) return;

    const markReady = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      onReadyRef.current();
    };

    const maybeReady = () => {
      const video = root.querySelector('video');
      if (!video) return;
      const hasFrames = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      const isPlaying = !video.paused && video.readyState >= HTMLMediaElement.HAVE_METADATA;
      if (hasFrames || isPlaying) markReady();
    };

    root.addEventListener('canplay', markReady, true);
    root.addEventListener('playing', markReady, true);
    root.addEventListener('loadeddata', markReady, true);

    const mo = new MutationObserver(maybeReady);
    mo.observe(root, { childList: true, subtree: true });
    const interval = window.setInterval(maybeReady, 250);
    maybeReady();

    return () => {
      root.removeEventListener('canplay', markReady, true);
      root.removeEventListener('playing', markReady, true);
      root.removeEventListener('loadeddata', markReady, true);
      mo.disconnect();
      window.clearInterval(interval);
    };
  }, [containerRef, enabled, sourceKey]);
}
