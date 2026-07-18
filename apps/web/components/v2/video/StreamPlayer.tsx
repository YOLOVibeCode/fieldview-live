'use client';

/**
 * StreamPlayer - Unified player facade that selects the optimal player
 * based on stream provider metadata from the bootstrap API.
 *
 * - Mux streams → MuxStreamPlayer (analytics, signed URLs, thumbnails)
 * - All other streams → VidstackPlayer (generic HLS/RTMP/embed)
 *
 * Children (e.g., BookmarkMarkers) are overlaid on top of the player.
 */

import { type ReactNode } from 'react';
import type { MediaPlayerInstance } from '@vidstack/react';

import { VidstackPlayer, type PlayerStatus } from './VidstackPlayer';
import { MuxStreamPlayer } from './MuxStreamPlayer';

export interface StreamPlayerProps {
  /** HLS stream URL (used for non-Mux streams) */
  src: string;
  /** Stream provider from bootstrap API */
  streamProvider?: string | null;
  /** Mux playback ID (used when streamProvider is 'mux_managed') */
  muxPlaybackId?: string | null;
  /** Signed playback token for Mux protected streams */
  playbackToken?: string;
  /** Stream type hint for Mux player */
  streamType?: 'live' | 'on-demand' | 'live:dvr' | 'll-live' | 'll-live:dvr';
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
  /** Ref for Vidstack player instance (only available for non-Mux streams) */
  playerRef?: React.MutableRefObject<MediaPlayerInstance | null>;
  /** Additional className for the player container */
  className?: string;
  /** Children rendered as overlays on top of the player */
  children?: ReactNode;
  /** Mux Data metadata for analytics */
  metadata?: Record<string, string>;
  /** data-testid for testing */
  'data-testid'?: string;
}

export function StreamPlayer({
  src,
  streamProvider,
  muxPlaybackId,
  playbackToken,
  streamType,
  autoPlay = true,
  muted = true,
  onStatusChange,
  onTimeUpdate,
  onDurationChange,
  playerRef,
  className,
  children,
  metadata,
  'data-testid': testId,
}: StreamPlayerProps) {
  const trimmedPlaybackId = muxPlaybackId?.trim() || null;
  const useMuxPlayer = streamProvider === 'mux_managed' && trimmedPlaybackId;

  if (useMuxPlayer) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <MuxStreamPlayer
          playbackId={trimmedPlaybackId}
          streamType={streamType}
          playbackToken={playbackToken}
          autoPlay={autoPlay}
          muted={muted}
          onStatusChange={onStatusChange}
          onTimeUpdate={onTimeUpdate}
          onDurationChange={onDurationChange}
          metadata={metadata}
          data-testid={testId ?? 'stream-player-mux'}
        />
        {children && (
          <div className="absolute inset-0 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <VidstackPlayer
      src={src}
      autoPlay={autoPlay}
      muted={muted}
      onStatusChange={onStatusChange}
      onTimeUpdate={onTimeUpdate}
      onDurationChange={onDurationChange}
      playerRef={playerRef}
      className={className}
      data-testid={testId ?? 'stream-player-vidstack'}
    >
      {children}
    </VidstackPlayer>
  );
}
