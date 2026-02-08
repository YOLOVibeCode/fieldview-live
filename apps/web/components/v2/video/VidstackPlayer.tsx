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
 * - Built-in seeking controls (+-10s buttons, arrows for +-5s)
 * - Precision seeking via comma/period for +-1s
 * - Mobile double-tap gestures for +-10s
 * - Full keyboard accessibility (Space, M, F, arrows)
 */

import { useRef, useCallback, type ReactNode } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Gesture,
  type MediaPlayerInstance,
} from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import './vidstack-theme.css';

import { SeekBackwardButton, SeekForwardButton } from './SeekButtons';

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
  }, [onStatusChange]);

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

      {/* Mobile gestures: double-tap left half for -10s, right half for +10s */}
      <Gesture
        className="absolute inset-y-0 left-0 w-1/2 z-0"
        event="dblpointerup"
        action="seek:-10"
      />
      <Gesture
        className="absolute inset-y-0 right-0 w-1/2 z-0"
        event="dblpointerup"
        action="seek:10"
      />

      <DefaultVideoLayout
        icons={defaultLayoutIcons}
        slots={{
          beforePlayButton: <SeekBackwardButton />,
          afterPlayButton: <SeekForwardButton />,
        }}
      />

      {children}
    </MediaPlayer>
  );
}
