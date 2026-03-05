'use client';

/**
 * VidstackPlayer - Vidstack-based HLS video player
 *
 * Replaces the old VideoPlayer + VideoControls + raw HLS.js setup.
 * Uses Vidstack's built-in HLS support (powered by hls.js internally)
 * with the DefaultVideoLayout for controls.
 *
 * Features:
 * - HLS streaming with automatic quality adaptation
 * - Full keyboard accessibility (Space, M, F, arrows)
 * - Seek controls via SeekOverlay (tap-to-reveal buttons)
 */

import { useRef, useState, useCallback, type ReactNode } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import './vidstack-theme.css';

import { VidstackGoLiveButton } from './VidstackGoLiveButton';
import { SeekOverlay } from './SeekOverlay';

export type PlayerStatus = 'loading' | 'playing' | 'offline' | 'error';

export interface VidstackPlayerProps {
  /** HLS stream URL (or empty string when no stream) */
  src: string;
  /** Auto-play on load (requires muted for browser policy) */
  autoPlay?: boolean;
  /** Start muted */
  muted?: boolean;
  /** Callback when player status changes */
  onStatusChange?: (status: PlayerStatus) => void;
  /** Callback on time update (current time in seconds) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Callback when duration changes */
  onDurationChange?: (duration: number) => void;
  /** Ref to access the MediaPlayer instance for external control */
  playerRef?: React.MutableRefObject<MediaPlayerInstance | null>;
  /** Additional className for the player container */
  className?: string;
  /** Children rendered as overlays on top of the player */
  children?: ReactNode;
  /** data-testid for testing */
  'data-testid'?: string;
}

export function VidstackPlayer({
  src,
  autoPlay = true,
  muted = true,
  onStatusChange,
  onTimeUpdate,
  onDurationChange,
  playerRef: externalRef,
  className,
  children,
  'data-testid': testId = 'vidstack-player',
}: VidstackPlayerProps) {
  const internalRef = useRef<MediaPlayerInstance>(null);
  const playerRef = externalRef ?? internalRef;
  const [isPaused, setIsPaused] = useState(false);

  // Track status changes
  const handleCanPlay = useCallback(() => {
    onStatusChange?.('playing');
  }, [onStatusChange]);

  const handleWaiting = useCallback(() => {
    onStatusChange?.('loading');
  }, [onStatusChange]);

  const handleError = useCallback(() => {
    onStatusChange?.('error');
  }, [onStatusChange]);

  const handlePlaying = useCallback(() => {
    onStatusChange?.('playing');
    setIsPaused(false);
  }, [onStatusChange]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // SeekOverlay callbacks
  const handleSeek = useCallback(
    (deltaSeconds: number) => {
      const player = playerRef.current;
      if (!player) return;
      const cur = player.currentTime ?? 0;
      const dur = player.duration ?? Infinity;
      player.currentTime = Math.max(0, Math.min(cur + deltaSeconds, dur));
    },
    [playerRef]
  );

  const handleTogglePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  }, [playerRef]);

  return (
    <MediaPlayer
      ref={playerRef}
      src={src || undefined}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      onCanPlay={handleCanPlay}
      onWaiting={handleWaiting}
      onError={handleError}
      onPlaying={handlePlaying}
      onPause={handlePause}
      onTimeUpdate={(detail) => onTimeUpdate?.(detail.currentTime)}
      onDurationChange={(detail) => onDurationChange?.(detail)}
      className={className}
      data-testid={testId}
      keyShortcuts={{
        // Default arrow keys = +-5s (Vidstack built-in)
        // Comma/period for +-1s precision seeking
        seekBackward: 'ArrowLeft , Shift+ArrowLeft',
        seekForward: 'ArrowRight . Shift+ArrowRight',
      }}
    >
      <MediaProvider />

      <DefaultVideoLayout
        icons={defaultLayoutIcons}
        slots={{
          // Seek buttons and timeline removed; seeking is done via SeekOverlay
          timeSlider: null,
          beforePlayButton: null,
          afterPlayButton: null,
        }}
      />

      <SeekOverlay
        onSeek={handleSeek}
        onTogglePause={handleTogglePause}
        isPaused={isPaused}
      />

      <VidstackGoLiveButton />
      {children}
    </MediaPlayer>
  );
}
