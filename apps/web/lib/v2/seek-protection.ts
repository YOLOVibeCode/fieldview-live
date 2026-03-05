/**
 * Seek protection: ISP interfaces and pure implementations.
 * Used to guard against accidental large seeks (e.g. to 0) on the timeline.
 */

export interface ISeekDecision {
  /** Returns true if a seek from currentTime to targetTime should require confirmation. */
  shouldConfirm(
    currentTime: number,
    targetTime: number,
    duration: number
  ): boolean;
}

export interface ILiveEdgeDetector {
  /** Returns true when viewer is more than thresholdSeconds behind the live edge (duration). */
  isBehindLiveEdge(
    currentTime: number,
    duration: number,
    thresholdSeconds: number
  ): boolean;
}

export interface SeekProtectionConfig {
  confirmThresholdSeconds: number;
  confirmTimeoutMs: number;
  liveEdgeThresholdSeconds: number;
  enabled: boolean;
}

export const DEFAULT_SEEK_PROTECTION_CONFIG: SeekProtectionConfig = {
  confirmThresholdSeconds: 30,
  confirmTimeoutMs: 3000,
  liveEdgeThresholdSeconds: 15,
  enabled: true,
};

/** Pure implementation: confirm when delta >= threshold or seeking to 0 from above threshold. */
export class SeekDecision implements ISeekDecision {
  constructor(private config: SeekProtectionConfig) {}

  shouldConfirm(
    currentTime: number,
    targetTime: number,
    _duration: number
  ): boolean {
    if (!this.config.enabled) return false;
    const delta = Math.abs(targetTime - currentTime);
    if (delta < this.config.confirmThresholdSeconds) return false;
    if (targetTime === 0 && currentTime >= this.config.confirmThresholdSeconds)
      return true;
    return delta >= this.config.confirmThresholdSeconds;
  }
}

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
