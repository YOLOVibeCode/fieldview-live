'use client';

/**
 * MuxStreamPlayer - Mux Player wrapper for Mux-managed streams.
 *
 * Uses @mux/mux-player-react which provides:
 * - Automatic signed URL token refresh
 * - Mux Data analytics integration
 * - Thumbnail previews on seek bar (storyboard sprites)
 * - Built-in seek forward/backward buttons
 * - Stream type awareness (live vs on-demand vs DVR)
 * - Seek protection: large seeks show confirmation; Go Live when behind live edge (DVR/live).
 */

import { useRef, useState, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';

import type { PlayerStatus } from './VidstackPlayer';
import { SeekConfirmOverlay } from './SeekConfirmOverlay';
import { GoLiveButton } from './GoLiveButton';
import {
  SeekDecision,
  LiveEdgeDetector,
  DEFAULT_SEEK_PROTECTION_CONFIG,
} from '@/lib/v2/seek-protection';

const seekDecision = new SeekDecision(DEFAULT_SEEK_PROTECTION_CONFIG);
const liveEdgeDetector = new LiveEdgeDetector();
const liveThreshold = DEFAULT_SEEK_PROTECTION_CONFIG.liveEdgeThresholdSeconds;
const confirmTimeoutMs = DEFAULT_SEEK_PROTECTION_CONFIG.confirmTimeoutMs;

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
  const playerRef = useRef<{ currentTime: number } | null>(null);
  const prevTimeRef = useRef<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  const handleWaiting = useCallback(() => {
    onStatusChange?.('loading');
  }, [onStatusChange]);

  const handleError = useCallback(() => {
    onStatusChange?.('error');
  }, [onStatusChange]);

  const handlePlaying = useCallback(() => {
    onStatusChange?.('playing');
  }, [onStatusChange]);

  const handleTimeUpdate = useCallback(
    (evt: Event) => {
      const el = evt.target as HTMLMediaElement;
      const t = el.currentTime;
      prevTimeRef.current = t;
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

  const handleSeeked = useCallback(
    (evt: Event) => {
      const el = evt.target as HTMLMediaElement;
      const newTime = el.currentTime;
      const prev = prevTimeRef.current;
      if (seekDecision.shouldConfirm(prev, newTime, duration)) {
        const player = playerRef.current;
        if (player && typeof player.currentTime === 'number') {
          player.currentTime = prev;
        }
        setPendingSeek(newTime);
        setCurrentTime(prev);
      } else {
        prevTimeRef.current = newTime;
      }
    },
    [duration]
  );

  const handleSeekConfirm = useCallback(() => {
    if (pendingSeek === null) return;
    const player = playerRef.current;
    if (player && typeof player.currentTime === 'number') {
      player.currentTime = pendingSeek;
    }
    setPendingSeek(null);
  }, [pendingSeek]);

  const handleSeekCancel = useCallback(() => {
    setPendingSeek(null);
  }, []);

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
        // MuxPlayerElement has currentTime; we use it for seek-back and go-live
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
        forwardSeekOffset={10}
        backwardSeekOffset={10}
        onWaiting={handleWaiting}
        onError={handleError}
        onPlaying={handlePlaying}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onSeeked={handleSeeked}
        className={className}
        data-testid={testId}
        style={{ aspectRatio: '16 / 9', width: '100%' }}
      />
      {pendingSeek !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <SeekConfirmOverlay
            targetTime={pendingSeek}
            onConfirm={handleSeekConfirm}
            onCancel={handleSeekCancel}
            timeoutMs={confirmTimeoutMs}
          />
        </div>
      )}
      <GoLiveButton visible={showGoLive} onClick={handleGoLive} />
    </div>
  );
}
