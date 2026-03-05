'use client';

/**
 * SafeTimeSlider – Vidstack TimeSlider wrapper that intercepts large seeks and shows confirmation.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { TimeSlider, useMediaPlayer, useMediaState, useMediaRemote } from '@vidstack/react';
import { SeekConfirmOverlay } from './SeekConfirmOverlay';
import {
  SeekDecision,
  DEFAULT_SEEK_PROTECTION_CONFIG,
  type SeekProtectionConfig,
} from '@/lib/v2/seek-protection';

const defaultConfig: SeekProtectionConfig = DEFAULT_SEEK_PROTECTION_CONFIG;
const seekDecision = new SeekDecision(defaultConfig);

export function SafeTimeSlider() {
  const player = useMediaPlayer();
  const currentTime = useMediaState('currentTime') ?? 0;
  const duration = useMediaState('duration') ?? 0;
  const remote = useMediaRemote();
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSeekRequest = useCallback(
    (e: Event) => {
      const targetTime = (e as CustomEvent<number>).detail;
      if (typeof targetTime !== 'number' || !Number.isFinite(targetTime)) return;
      if (seekDecision.shouldConfirm(currentTime, targetTime, duration)) {
        e.preventDefault();
        e.stopPropagation();
        setPendingSeek(targetTime);
      }
    },
    [currentTime, duration]
  );

  useEffect(() => {
    const el = player?.$el ?? player;
    if (!el?.addEventListener) return;
    el.addEventListener('media-seek-request', handleSeekRequest, true);
    return () => {
      el.removeEventListener('media-seek-request', handleSeekRequest, true);
    };
  }, [player, handleSeekRequest]);

  const handleConfirm = useCallback(() => {
    if (pendingSeek !== null) {
      remote.seek(pendingSeek);
      setPendingSeek(null);
    }
  }, [pendingSeek, remote]);

  const handleCancel = useCallback(() => {
    setPendingSeek(null);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-1 items-center" data-testid="safe-time-slider">
      <TimeSlider.Root
        className="group relative flex w-full cursor-pointer touch-none select-none items-center"
        data-testid="time-slider-root"
      >
        <TimeSlider.Track className="relative h-[5px] w-full rounded-sm bg-white/20">
          <TimeSlider.TrackFill className="absolute h-full w-[var(--slider-fill)] rounded-sm bg-[var(--media-brand)]" />
          <TimeSlider.Progress className="absolute h-full w-[var(--slider-progress)] rounded-sm bg-white/30" />
        </TimeSlider.Track>
        <TimeSlider.Thumb className="absolute left-[var(--slider-fill)] top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--media-brand)] opacity-0 transition-opacity group-hover:opacity-100 group-data-[dragging]:opacity-100" />
        <TimeSlider.Preview className="flex flex-col items-center opacity-0 transition-opacity group-data-[pointing]:opacity-100">
          <TimeSlider.Value className="rounded bg-black/80 px-1 py-0.5 text-xs font-medium" />
        </TimeSlider.Preview>
      </TimeSlider.Root>
      {pendingSeek !== null && (
        <SeekConfirmOverlay
          targetTime={pendingSeek}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          timeoutMs={defaultConfig.confirmTimeoutMs}
        />
      )}
    </div>
  );
}
