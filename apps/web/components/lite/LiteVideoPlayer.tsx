/**
 * LiteVideoPlayer
 *
 * A thin, single-<video> player driven by raw hls.js. No third-party player
 * chrome — the wrapper (LiteViewer) owns layout, overlays, and fullscreen.
 *
 * Provider handling (from bootstrap streamProvider + muxPlaybackId):
 * - mux_managed: play https://stream.mux.com/{muxPlaybackId}.m3u8 via hls.js
 *   (public playback IDs; signed/DRM tokens are a follow-up — see plan Risks).
 * - byo_hls: play streamUrl directly via hls.js (Safari native HLS fallback).
 * - external_embed: render the URL in an <iframe>.
 * - byo_rtmp / unknown / null: not directly playable → report 'offline'.
 *
 * Modeled on the proven initPlayer() in
 * components/direct-stream/DirectHlsAdminPage.tsx.
 */

'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Hls from 'hls.js';

export type LiteStreamStatus = 'loading' | 'playing' | 'offline' | 'error';

export interface LiteVideoPlayerProps {
  streamUrl: string | null;
  streamProvider?: string | null;
  muxPlaybackId?: string | null;
  muted?: boolean;
  className?: string;
  onStatusChange?: (status: LiteStreamStatus) => void;
}

export interface LiteVideoPlayerHandle {
  getVideo: () => HTMLVideoElement | null;
}

const MUX_STREAM_BASE = 'https://stream.mux.com';

/**
 * Resolve the actual HLS source URL the player should load, or null if the
 * provider isn't directly playable as HLS.
 */
export function resolveLiteSource(
  streamUrl: string | null,
  streamProvider?: string | null,
  muxPlaybackId?: string | null
): { kind: 'hls'; url: string } | { kind: 'embed'; url: string } | { kind: 'none' } {
  if (streamProvider === 'external_embed' && streamUrl) {
    return { kind: 'embed', url: streamUrl };
  }
  if (streamProvider === 'mux_managed') {
    if (muxPlaybackId) {
      return { kind: 'hls', url: `${MUX_STREAM_BASE}/${muxPlaybackId}.m3u8` };
    }
    if (streamUrl) return { kind: 'hls', url: streamUrl };
    return { kind: 'none' };
  }
  if (streamProvider === 'byo_hls' && streamUrl) {
    return { kind: 'hls', url: streamUrl };
  }
  // byo_rtmp / unknown / null, or no URL: if it looks like an .m3u8, still try.
  if (streamUrl && /\.m3u8($|\?|#)/.test(streamUrl)) {
    return { kind: 'hls', url: streamUrl };
  }
  return { kind: 'none' };
}

export const LiteVideoPlayer = forwardRef<LiteVideoPlayerHandle, LiteVideoPlayerProps>(
  function LiteVideoPlayer(
    { streamUrl, streamProvider, muxPlaybackId, muted = true, className, onStatusChange },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({ getVideo: () => videoRef.current }), []);

    const source = resolveLiteSource(streamUrl, streamProvider, muxPlaybackId);

    useEffect(() => {
      if (source.kind !== 'hls') {
        if (source.kind === 'none') onStatusChange?.('offline');
        return;
      }

      const video = videoRef.current;
      if (!video) {
        onStatusChange?.('offline');
        return;
      }

      const url = source.url;
      onStatusChange?.('loading');

      // Native HLS (Safari / iOS) — preferred when available.
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          const onLoaded = () => {
            onStatusChange?.('playing');
            void video.play().catch(() => {/* autoplay policy */});
          };
          const onError = () => onStatusChange?.('error');
          video.addEventListener('loadedmetadata', onLoaded);
          video.addEventListener('error', onError);
          return () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onError);
            video.removeAttribute('src');
            video.load();
          };
        }
        onStatusChange?.('error');
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onStatusChange?.('playing');
        void video.play().catch(() => {/* autoplay policy may reject */});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onStatusChange?.('error');
      });

      return () => {
        hls.destroy();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source.kind === 'hls' ? source.url : source.kind]);

    if (source.kind === 'embed') {
      return (
        <iframe
          data-testid="lite-video-embed"
          src={source.url}
          className={className}
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <video
        ref={videoRef}
        data-testid="lite-video"
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        playsInline
        muted={muted}
        controls={false}
      />
    );
  }
);
