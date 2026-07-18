'use client';

/**
 * SeekOverlay - Tap-to-reveal frosted-glass seek strip overlaid on the video player.
 *
 * Trigger: tap the center 20% of the video, or long-press (2s) anywhere above controls.
 * Shows a 9-segment icon strip:  |◀  ◀◀◀  ◀◀  ◀  ⏸/▶  ▶  ▶▶  ▶▶▶  ▶|
 * Dismiss: tap outside the strip, or auto-dismiss after 3s idle.
 *
 * IMPORTANT: The overlay uses pointer-events-none by default and excludes the
 * bottom 60px so native player controls (volume, fullscreen, etc.) remain accessible.
 */

import { useCallback, type MouseEvent } from 'react';
import { useSeekOverlay } from '@/hooks/v2/useSeekOverlay';

/* ─── SVG Icon Helpers ─── */

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <polyline points={direction === 'left' ? '15,6 9,12 15,18' : '9,6 15,12 9,18'} />
    </svg>
  );
}

function PipeBar({ side }: { side: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 6 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" className={`w-1.5 h-4 shrink-0 ${side === 'left' ? '-mr-1' : '-ml-1'}`}>
      <line x1="3" y1="5" x2="3" y2="19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <polygon points="7,4 20,12 7,20" />
    </svg>
  );
}

/* ─── Segment Definitions ─── */

type SegmentAction =
  | { type: 'seek'; delta: number }
  | { type: 'pause' }
  | { type: 'start' }
  | { type: 'live' };

interface Segment {
  key: string;
  action: SegmentAction;
  ariaLabel: string;
  testId: string;
}

const SEGMENTS: Segment[] = [
  { key: 'start', action: { type: 'start' }, ariaLabel: 'Go to start', testId: 'seek-overlay-btn-start' },
  { key: '-30', action: { type: 'seek', delta: -30 }, ariaLabel: 'Seek -30 seconds', testId: 'seek-overlay-btn--30' },
  { key: '-10', action: { type: 'seek', delta: -10 }, ariaLabel: 'Seek -10 seconds', testId: 'seek-overlay-btn--10' },
  { key: '-1', action: { type: 'seek', delta: -1 }, ariaLabel: 'Seek -1 second', testId: 'seek-overlay-btn--1' },
  { key: 'pause', action: { type: 'pause' }, ariaLabel: 'Pause', testId: 'seek-overlay-btn-pause' },
  { key: '+1', action: { type: 'seek', delta: 1 }, ariaLabel: 'Seek +1 second', testId: 'seek-overlay-btn-1' },
  { key: '+10', action: { type: 'seek', delta: 10 }, ariaLabel: 'Seek +10 seconds', testId: 'seek-overlay-btn-10' },
  { key: '+30', action: { type: 'seek', delta: 30 }, ariaLabel: 'Seek +30 seconds', testId: 'seek-overlay-btn-30' },
  { key: 'live', action: { type: 'live' }, ariaLabel: 'Go to live', testId: 'seek-overlay-btn-live' },
];

function SegmentIcon({ segmentKey, isPaused }: { segmentKey: string; isPaused: boolean }) {
  switch (segmentKey) {
    case 'start':
      return <span className="flex items-center"><PipeBar side="left" /><Chevron direction="left" /></span>;
    case '-30':
      return <span className="flex items-center -space-x-1.5"><Chevron direction="left" /><Chevron direction="left" /><Chevron direction="left" /></span>;
    case '-10':
      return <span className="flex items-center -space-x-1"><Chevron direction="left" /><Chevron direction="left" /></span>;
    case '-1':
      return <Chevron direction="left" />;
    case 'pause':
      return isPaused ? <PlayIcon /> : <PauseIcon />;
    case '+1':
      return <Chevron direction="right" />;
    case '+10':
      return <span className="flex items-center -space-x-1"><Chevron direction="right" /><Chevron direction="right" /></span>;
    case '+30':
      return <span className="flex items-center -space-x-1.5"><Chevron direction="right" /><Chevron direction="right" /><Chevron direction="right" /></span>;
    case 'live':
      return <span className="flex items-center"><Chevron direction="right" /><PipeBar side="right" /></span>;
    default:
      return null;
  }
}

/* ─── SeekOverlay Component ─── */

export interface SeekOverlayProps {
  onSeek: (deltaSeconds: number) => void;
  onTogglePause: () => void;
  onGoToStart: () => void;
  onGoLive: () => void;
  isPaused: boolean;
}

export function SeekOverlay({ onSeek, onTogglePause, onGoToStart, onGoLive, isPaused }: SeekOverlayProps) {
  const { isVisible, show, dismiss, resetAutoDismiss, longPressHandlers } =
    useSeekOverlay();

  const handleSegmentClick = useCallback(
    (action: SegmentAction) => (e: MouseEvent) => {
      e.stopPropagation();
      switch (action.type) {
        case 'seek':
          onSeek(action.delta);
          break;
        case 'pause':
          onTogglePause();
          break;
        case 'start':
          onGoToStart();
          break;
        case 'live':
          onGoLive();
          break;
      }
      resetAutoDismiss();
    },
    [onSeek, onTogglePause, onGoToStart, onGoLive, resetAutoDismiss]
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
      if (e.target === e.currentTarget) {
        dismiss();
      }
    },
    [dismiss]
  );

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="seek-overlay-root">
      {/* Long-press detection zone — excludes bottom 60px for native controls */}
      <div
        className="absolute inset-x-0 top-0 bottom-[60px] z-10 pointer-events-auto"
        style={{ display: isVisible ? 'none' : 'block' }}
        {...longPressHandlers}
        data-testid="seek-overlay-longpress-zone"
      >
        {/* Center 20% trigger zone */}
        <div
          className="absolute inset-y-0"
          style={{ left: '40%', right: '40%' }}
          onClick={handleCenterTap}
          data-testid="seek-overlay-trigger"
        />
      </div>

      {/* Visible strip — also excludes bottom 60px */}
      <div
        className={`
          absolute inset-x-0 top-0 bottom-[60px] z-20
          flex items-center justify-center
          transition-opacity duration-200
          ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={handleBackdropClick}
        data-testid="seek-overlay-backdrop"
      >
        <div
          className="flex items-center rounded-full bg-black/40 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden"
          data-testid="seek-overlay-buttons"
        >
          {SEGMENTS.map((segment, i) => {
            const isPauseBtn = segment.key === 'pause';
            return (
              <button
                key={segment.key}
                onClick={handleSegmentClick(segment.action)}
                className={`
                  flex items-center justify-center text-white/80
                  transition-all duration-100
                  hover:bg-white/15 hover:text-white active:scale-95
                  select-none touch-manipulation
                  ${isPauseBtn ? 'w-14 h-12' : 'w-12 h-12'}
                  ${i < SEGMENTS.length - 1 ? 'border-r border-white/10' : ''}
                `}
                aria-label={isPauseBtn ? (isPaused ? 'Play' : 'Pause') : segment.ariaLabel}
                data-testid={segment.testId}
              >
                <SegmentIcon segmentKey={segment.key} isPaused={isPaused} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
