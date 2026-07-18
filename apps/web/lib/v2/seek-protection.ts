/**
 * Live edge detection for DVR/live streams.
 * Used by GoLiveButton to show when viewer is behind the live edge.
 */

export interface ILiveEdgeDetector {
  /** Returns true when viewer is more than thresholdSeconds behind the live edge (duration). */
  isBehindLiveEdge(
    currentTime: number,
    duration: number,
    thresholdSeconds: number
  ): boolean;
}

export interface SeekProtectionConfig {
  liveEdgeThresholdSeconds: number;
}

export const DEFAULT_SEEK_PROTECTION_CONFIG: SeekProtectionConfig = {
  liveEdgeThresholdSeconds: 15,
};

/** Pure implementation: behind live edge when (duration - currentTime) > threshold. */
export class LiveEdgeDetector implements ILiveEdgeDetector {
  isBehindLiveEdge(
    currentTime: number,
    duration: number,
    thresholdSeconds: number
  ): boolean {
    if (duration === 0 || !Number.isFinite(duration)) return false;
    if (!Number.isFinite(currentTime)) return false;
    const behind = duration - currentTime;
    return behind > thresholdSeconds;
  }
}
