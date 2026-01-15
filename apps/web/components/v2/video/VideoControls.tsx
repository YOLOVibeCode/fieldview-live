/**
 * VideoControls Component
 * 
 * Video player control bar with play/pause, volume, seek, and fullscreen
 */

import React from 'react';
import { TouchButton } from '../primitives/TouchButton';

export interface VideoControlsProps {
  /** Whether video is currently playing */
  isPlaying: boolean;
  
  /** Whether video is muted */
  isMuted: boolean;
  
  /** Current volume (0-1) */
  volume: number;
  
  /** Current playback time in seconds */
  currentTime: number;
  
  /** Total video duration in seconds */
  duration: number;
  
  /** Handler for play/pause toggle */
  onPlayPause: () => void;
  
  /** Handler for mute toggle */
  onMuteToggle: () => void;
  
  /** Handler for volume change */
  onVolumeChange: (volume: number) => void;
  
  /** Handler for seeking to specific time */
  onSeek: (time: number) => void;
  
  /** Handler for fullscreen toggle */
  onFullscreenToggle: () => void;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * VideoControls - Video player control bar
 * 
 * Provides play/pause, volume control, seek bar, and fullscreen toggle.
 * Mobile-optimized with touch-friendly buttons.
 * 
 * @example
 * ```tsx
 * <VideoControls
 *   isPlaying={isPlaying}
 *   isMuted={isMuted}
 *   volume={volume}
 *   currentTime={currentTime}
 *   duration={duration}
 *   onPlayPause={() => togglePlay()}
 *   onMuteToggle={() => toggleMute()}
 *   onVolumeChange={(v) => setVolume(v)}
 *   onSeek={(time) => seek(time)}
 *   onFullscreenToggle={() => toggleFullscreen()}
 * />
 * ```
 */
export function VideoControls({
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  onPlayPause,
  onMuteToggle,
  onVolumeChange,
  onSeek,
  onFullscreenToggle,
  'data-testid': testId = 'video-controls',
}: VideoControlsProps) {
  return (
    <div
      data-testid={testId}
      className="
        flex
        items-center
        gap-2
        p-4
        bg-fv-bg-tertiary/90
        backdrop-blur-sm
        border-t
        border-fv-border
      "
    >
      {/* Play/Pause Button */}
      <TouchButton
        data-testid="btn-play-pause"
        variant="ghost"
        size="sm"
        onClick={onPlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          // Pause Icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          // Play Icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </TouchButton>
      
      {/* Mute Button */}
      <TouchButton
        data-testid="btn-mute"
        variant="ghost"
        size="sm"
        onClick={onMuteToggle}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          // Muted Icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : (
          // Unmuted Icon
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </TouchButton>
      
      {/* Volume Slider (Desktop only) */}
      <div className="hidden md:flex items-center gap-2">
        <input
          data-testid="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-20 accent-fv-primary"
          aria-label="Volume"
        />
      </div>
      
      {/* Time Display */}
      <div className="text-xs text-fv-text-secondary font-mono whitespace-nowrap">
        <span>{formatTime(currentTime)}</span>
        <span className="mx-1">/</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="flex-1 px-2">
        <input
          data-testid="video-progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full accent-fv-primary cursor-pointer"
          aria-label="Seek"
        />
      </div>
      
      {/* Fullscreen Button */}
      <TouchButton
        data-testid="btn-fullscreen"
        variant="ghost"
        size="sm"
        onClick={onFullscreenToggle}
        aria-label="Fullscreen"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      </TouchButton>
    </div>
  );
}

