'use client';

/**
 * SeekOverlay - Tap-to-reveal seek buttons overlaid on the video player.
 *
 * Trigger: tap the center 20% of the screen, or long-press (2s) anywhere.
 * Shows translucent buttons: -30 | -10 | -1 | PAUSE/PLAY | +1 | +10 | +30
 * Dismiss: tap outside the buttons, or auto-dismiss after 5s idle.
 */

import { useCallback, type MouseEvent } from 'react';
import { useSeekOverlay } from '@/hooks/v2/useSeekOverlay';

export interface SeekOverlayProps {
  /** Called with delta in seconds (negative = rewind, positive = forward) */
  onSeek: (deltaSeconds: number) => void;
  /** Called to toggle play/pause */
  onTogglePause: () => void;
  /** Whether the player is currently paused */
  isPaused: boolean;
}

const SEEK_BUTTONS = [
  { delta: -30, label: '-30' },
  { delta: -10, label: '-10' },
  { delta: -1, label: '-1' },
  { delta: 0, label: 'PAUSE' }, // special: toggle pause
  { delta: 1, label: '+1' },
  { delta: 10, label: '+10' },
  { delta: 30, label: '+30' },
] as const;

export function SeekOverlay({ onSeek, onTogglePause, isPaused }: SeekOverlayProps) {
  const { isVisible, show, dismiss, resetAutoDismiss, longPressHandlers } =
    useSeekOverlay();

  const handleButtonClick = useCallback(
    (delta: number) => (e: MouseEvent) => {
      e.stopPropagation();
      if (delta === 0) {
        onTogglePause();
      } else {
        onSeek(delta);
      }
      resetAutoDismiss();
    },
    [onSeek, onTogglePause, resetAutoDismiss]
  );

  const handleCenterTap = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (isVisible) {
        dismiss();
      } else {
        show();
      }
    },
    [isVisible, show, dismiss]
  );

  const handleBackdropClick = useCallback(
    (e: MouseEvent) => {
      // Only dismiss if the click is directly on the backdrop, not on a button
      if (e.target === e.currentTarget) {
        dismiss();
      }
    },
    [dismiss]
  );

  return (
    <>
      {/* Long-press detection zone — covers entire video area */}
      <div
        className="absolute inset-0 z-20"
        style={{ pointerEvents: isVisible ? 'none' : 'auto' }}
        {...longPressHandlers}
        data-testid="seek-overlay-longpress-zone"
      >
        {/* Center 20% trigger zone */}
        <div
          className="absolute inset-y-0"
          style={{ left: '40%', right: '40%', pointerEvents: 'auto' }}
          onClick={handleCenterTap}
          data-testid="seek-overlay-trigger"
        />
      </div>

      {/* Visible overlay with buttons */}
      {isVisible && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/30"
          onClick={handleBackdropClick}
          data-testid="seek-overlay-backdrop"
        >
          <div
            className="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-sm"
            data-testid="seek-overlay-buttons"
          >
            {SEEK_BUTTONS.map(({ delta, label }) => {
              const isPauseBtn = delta === 0;
              const displayLabel = isPauseBtn
                ? isPaused
                  ? 'PLAY'
                  : 'PAUSE'
                : label;

              return (
                <button
                  key={label}
                  onClick={handleButtonClick(delta)}
                  className={`
                    flex items-center justify-center rounded-full
                    bg-black/60 text-white font-bold
                    transition-all duration-100
                    hover:bg-black/80 active:scale-95
                    select-none touch-manipulation
                    ${isPauseBtn ? 'w-14 h-14 text-xs' : 'w-11 h-11 text-[11px]'}
                  `}
                  aria-label={isPauseBtn ? (isPaused ? 'Play' : 'Pause') : `Seek ${label} seconds`}
                  data-testid={`seek-overlay-btn-${isPauseBtn ? 'pause' : delta}`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
