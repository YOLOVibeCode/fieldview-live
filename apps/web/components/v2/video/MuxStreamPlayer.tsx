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
 */

import { useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';

import type { PlayerStatus } from './VidstackPlayer';

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

  const handleTimeUpdate = useCallback((evt: Event) => {
    const target = evt.target as HTMLVideoElement;
    onTimeUpdate?.(target.currentTime);
  }, [onTimeUpdate]);

  const handleDurationChange = useCallback((evt: Event) => {
    const target = evt.target as HTMLVideoElement;
    if (target.duration && isFinite(target.duration)) {
      onDurationChange?.(target.duration);
    }
  }, [onDurationChange]);

  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType={streamType}
      autoPlay={autoPlay ? 'muted' : false}
      muted={muted}
      tokens={playbackToken ? { playback: playbackToken } : undefined}
      metadata={metadata}
      accentColor="var(--fv-color-primary-500, #3B82F6)"
      forwardSeekOffset={10}
      backwardSeekOffset={10}
      onCanPlay={handleCanPlay}
      onWaiting={handleWaiting}
      onError={handleError}
      onPlaying={handlePlaying}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      className={className}
      data-testid={testId}
      style={{ aspectRatio: '16 / 9', width: '100%' }}
    />
  );
}
