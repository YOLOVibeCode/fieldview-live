/**
 * VideoPlayer Component
 * 
 * HTML5 video player with event handlers
 */

import React, { forwardRef } from 'react';

export interface VideoPlayerProps {
  /** Video source URL (supports HLS .m3u8, MP4, etc.) */
  src: string;
  
  /** Poster image URL */
  poster?: string;
  
  /** Auto-play video on load */
  autoPlay?: boolean;
  
  /** Mute audio */
  muted?: boolean;
  
  /** Loop video */
  loop?: boolean;
  
  /** Play inline on mobile (prevents fullscreen) */
  playsInline?: boolean;
  
  /** Show native browser controls */
  controls?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
  
  /** Event: Video starts playing */
  onPlay?: () => void;
  
  /** Event: Video pauses */
  onPause?: () => void;
  
  /** Event: Video time updates */
  onTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  
  /** Event: Video ends */
  onEnded?: () => void;
  
  /** Event: Video errors */
  onError?: () => void;
  
  /** Event: Metadata loaded */
  onLoadedMetadata?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * VideoPlayer - HTML5 video element wrapper
 * 
 * Provides a clean interface for video playback with
 * support for HLS streams, MP4, and other formats.
 * 
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * 
 * <VideoPlayer
 *   ref={videoRef}
 *   src="https://example.com/stream.m3u8"
 *   poster="https://example.com/poster.jpg"
 *   autoPlay
 *   muted
 *   playsInline
 *   onPlay={() => console.log('Playing')}
 * />
 * ```
 */
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer(
    {
      src,
      poster,
      autoPlay = false,
      muted = false,
      loop = false,
      playsInline = true,
      controls = false,
      className = '',
      'data-testid': testId = 'video-player',
      onPlay,
      onPause,
      onTimeUpdate,
      onEnded,
      onError,
      onLoadedMetadata,
    },
    ref
  ) {
    return (
      <video
        ref={ref}
        data-testid={testId}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        controls={controls}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
        className={`
          w-full
          h-full
          object-cover
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      />
    );
  }
);

