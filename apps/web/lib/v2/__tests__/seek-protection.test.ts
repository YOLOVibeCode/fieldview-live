/**
 * Unit tests for seek protection pure logic (SeekDecision, LiveEdgeDetector).
 */

import { describe, it, expect } from 'vitest';
import {
  SeekDecision,
  LiveEdgeDetector,
  DEFAULT_SEEK_PROTECTION_CONFIG,
  type SeekProtectionConfig,
} from '../seek-protection';

describe('SeekDecision', () => {
  const defaultConfig = { ...DEFAULT_SEEK_PROTECTION_CONFIG };
  const decision = new SeekDecision(defaultConfig);
  const duration = 600;

  it('returns false for delta < threshold', () => {
    expect(decision.shouldConfirm(100, 120, duration)).toBe(false);
    expect(decision.shouldConfirm(100, 80, duration)).toBe(false);
    expect(decision.shouldConfirm(0, 20, duration)).toBe(false);
  });

  it('returns true for delta >= threshold', () => {
    expect(decision.shouldConfirm(100, 140, duration)).toBe(true);
    expect(decision.shouldConfirm(100, 60, duration)).toBe(true);
    expect(decision.shouldConfirm(200, 160, duration)).toBe(true);
  });

  it('returns true for seeking to 0 from any position > threshold', () => {
    expect(decision.shouldConfirm(120, 0, duration)).toBe(true);
    expect(decision.shouldConfirm(60, 0, duration)).toBe(true);
    expect(decision.shouldConfirm(30, 0, duration)).toBe(true);
  });

  it('respects custom threshold config', () => {
    const custom: SeekProtectionConfig = {
      ...defaultConfig,
      confirmThresholdSeconds: 60,
    };
    const customDecision = new SeekDecision(custom);
    expect(customDecision.shouldConfirm(100, 140, duration)).toBe(false);
    expect(customDecision.shouldConfirm(100, 170, duration)).toBe(true);
  });

  it('returns false when disabled', () => {
    const disabled: SeekProtectionConfig = {
      ...defaultConfig,
      enabled: false,
    };
    const disabledDecision = new SeekDecision(disabled);
    expect(disabledDecision.shouldConfirm(100, 0, duration)).toBe(false);
    expect(disabledDecision.shouldConfirm(100, 200, duration)).toBe(false);
  });
});

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
