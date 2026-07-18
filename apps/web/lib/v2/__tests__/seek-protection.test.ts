/**
 * Unit tests for LiveEdgeDetector.
 */

import { describe, it, expect } from 'vitest';
import { LiveEdgeDetector } from '../seek-protection';

describe('LiveEdgeDetector', () => {
  const detector = new LiveEdgeDetector();
  const threshold = 15;

  it('returns true when behind threshold', () => {
    expect(detector.isBehindLiveEdge(0, 600, threshold)).toBe(true);
    expect(detector.isBehindLiveEdge(500, 600, threshold)).toBe(true);
    expect(detector.isBehindLiveEdge(580, 600, threshold)).toBe(true);
  });

  it('returns false when within threshold', () => {
    expect(detector.isBehindLiveEdge(590, 600, threshold)).toBe(false);
    expect(detector.isBehindLiveEdge(586, 600, threshold)).toBe(false);
    expect(detector.isBehindLiveEdge(600, 600, threshold)).toBe(false);
  });

  it('returns false when duration is 0 or NaN', () => {
    expect(detector.isBehindLiveEdge(10, 0, threshold)).toBe(false);
    expect(detector.isBehindLiveEdge(10, Number.NaN, threshold)).toBe(false);
  });
});
