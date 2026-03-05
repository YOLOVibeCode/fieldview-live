'use client';

/**
 * VidstackGoLiveButton – shows Go Live when behind live edge; uses Vidstack hooks and seeks to duration.
 */

import { useCallback } from 'react';
import { useMediaState, useMediaRemote } from '@vidstack/react';
import { GoLiveButton } from './GoLiveButton';
import {
  LiveEdgeDetector,
  DEFAULT_SEEK_PROTECTION_CONFIG,
} from '@/lib/v2/seek-protection';

const detector = new LiveEdgeDetector();
const threshold = DEFAULT_SEEK_PROTECTION_CONFIG.liveEdgeThresholdSeconds;

export function VidstackGoLiveButton() {
  const currentTime = useMediaState('currentTime') ?? 0;
  const duration = useMediaState('duration') ?? 0;
  const remote = useMediaRemote();
  const visible =
    Number.isFinite(duration) &&
    duration > 0 &&
    detector.isBehindLiveEdge(currentTime, duration, threshold);
  const onClick = useCallback(() => {
    if (Number.isFinite(duration)) remote.seek(duration);
  }, [duration, remote]);
  return <GoLiveButton visible={visible} onClick={onClick} />;
}
