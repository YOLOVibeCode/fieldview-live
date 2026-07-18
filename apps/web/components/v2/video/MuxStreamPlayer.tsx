'use client';

/**
 * MuxStreamPlayer - Mux Player wrapper for Mux-managed streams.
 *
 * Uses @mux/mux-player-react which provides:
 * - Automatic signed URL token refresh
 * - Mux Data analytics integration
 * - Stream type awareness (live vs on-demand vs DVR)
 * - Go Live button when behind live edge (DVR/live)
 *
 * Seek controls are provided by the SeekOverlay (tap-to-reveal buttons).
 * The built-in seek bar and skip buttons are hidden via mux-overrides.css.
 */

import { useRef, useState, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';

import type { PlayerStatus } from './VidstackPlayer';
import { GoLiveButton } from './GoLiveButton';
import { SeekOverlay } from './SeekOverlay';
import {
  LiveEdgeDetector,
  DEFAULT_SEEK_PROTECTION_CONFIG,
} from '@/lib/v2/seek-protection';

import './mux-overrides.css';

const liveEdgeDetector = new LiveEdgeDetector();
const liveThreshold = DEFAULT_SEEK_PROTECTION_CONFIG.liveEdgeThresholdSeconds;

export interface MuxStreamPlayerProps {
  /** Mux playback ID (e.g., "abc123") */
  playbackId: string;
  /** Stream type hint */
  streamType?: 'live' | 'on-demand' | 'live:dvr' | 'll-live' | 'll-live:dvr';
  /** Signed playback token (for protected streams) */
  playbackToken?: string;
  /** Auto-play on load */
  autoPlay?: boolean;
  /** Start muted */
  muted?: boolean;
  /** Callback when player status changes */
  onStatusChange?: (status: PlayerStatus) => void;
  /** Callback on time update (current time in seconds) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Callback when duration changes */
  onDurationChange?: (duration: number) => void;
  /** Additional className for the player container */
  className?: string;
  /** Mux Data metadata for analytics */
  metadata?: Record<string, string>;
  /** data-testid for testing */
  'data-testid'?: string;
}

export function MuxStreamPlayer({
  playbackId,
  streamType = 'on-demand',
  playbackToken,
  autoPlay = true,
  muted = true,
  onStatusChange,
  onTimeUpdate,
  onDurationChange,
  className,
  metadata,
  'data-testid': testId = 'mux-player',
}: MuxStreamPlayerProps) {
  const playerRef = useRef<{ currentTime: number; play(): void; pause(): void; paused: boolean } | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

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

  const handleTimeUpdate = useCallback(
    (evt: Event) => {
      const el = evt.target as HTMLMediaElement;
      const t = el.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    },
    [onTimeUpdate]
  );

  const handleDurationChange = useCallback(
    (evt: Event) => {
      const el = evt.target as HTMLMediaElement;
      if (el.duration && isFinite(el.duration)) {
        setDuration(el.duration);
        onDurationChange?.(el.duration);
      }
    },
    [onDurationChange]
  );

  // SeekOverlay callbacks
  const handleSeek = useCallback(
    (deltaSeconds: number) => {
      const player = playerRef.current;
      if (player && typeof player.currentTime === 'number') {
        const newTime = Math.max(0, player.currentTime + deltaSeconds);
        player.currentTime = Number.isFinite(duration) ? Math.min(newTime, duration) : newTime;
      }
    },
    [duration]
  );

  const handleTogglePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  }, []);

  const handleGoToStart = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = 0;
    }
  }, []);

  // Go Live logic
  const showGoLive =
    (streamType.includes('dvr') || streamType.includes('live')) &&
    Number.isFinite(duration) &&
    duration > 0 &&
    liveEdgeDetector.isBehindLiveEdge(currentTime, duration, liveThreshold);

  const handleGoLive = useCallback(() => {
    const player = playerRef.current;
    if (player && Number.isFinite(duration)) {
      player.currentTime = duration;
    }
  }, [duration]);

  return (
    <div className="relative" data-testid="mux-player-wrapper">
      <MuxPlayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={playerRef as any}
        playbackId={playbackId}
        streamType={streamType}
        autoPlay={autoPlay ? 'muted' : false}
        muted={muted}
        playsInline
        tokens={playbackToken ? { playback: playbackToken } : undefined}
        metadata={metadata}
        accentColor="var(--fv-color-primary-500, #3B82F6)"
        onWaiting={handleWaiting}
        onError={handleError}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        className={className}
        data-testid={testId}
        style={{ aspectRatio: '16 / 9', width: '100%' }}
      />
      <SeekOverlay
        onSeek={handleSeek}
        onTogglePause={handleTogglePause}
        onGoToStart={handleGoToStart}
        onGoLive={handleGoLive}
        isPaused={isPaused}
      />
      <GoLiveButton visible={showGoLive} onClick={handleGoLive} />
    </div>
  );
}
