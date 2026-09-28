'use client';

/**
 * VidstackGoLiveButton – shows Go Live when behind live edge; seeks to seekable end.
 */

import { useCallback } from 'react';
import { useMediaState, useMediaRemote } from '@vidstack/react';
import { GoLiveButton } from './GoLiveButton';
import {
  LiveEdgeDetector,
  DEFAULT_SEEK_PROTECTION_CONFIG,
} from '@/lib/v2/seek-protection';
import { getSeekableRange, seekToLive } from '@/lib/v2/live-seek';

const detector = new LiveEdgeDetector();
const threshold = DEFAULT_SEEK_PROTECTION_CONFIG.liveEdgeThresholdSeconds;

export function VidstackGoLiveButton() {
  const currentTime = useMediaState('currentTime') ?? 0;
  const duration = useMediaState('duration') ?? 0;
  const seekableStart = useMediaState('seekableStart') ?? 0;
  const seekableEnd = useMediaState('seekableEnd') ?? 0;
  const remote = useMediaRemote();

  const liveEdge =
    seekableEnd > seekableStart
      ? seekableEnd
      : Number.isFinite(duration) && duration > 0
        ? duration
        : 0;

  const visible =
    liveEdge > 0 &&
    detector.isBehindLiveEdge(currentTime, liveEdge, threshold);

  const onClick = useCallback(() => {
    const range = getSeekableRange({
      seekable: {
        length: seekableEnd > seekableStart ? 1 : 0,
        start: () => seekableStart,
        end: () => seekableEnd,
      } as TimeRanges,
      duration,
    });
    if (range) {
      remote.seek(seekToLive(range.end));
    }
  }, [duration, remote, seekableEnd, seekableStart]);

  return <GoLiveButton visible={visible} onClick={onClick} />;
}
