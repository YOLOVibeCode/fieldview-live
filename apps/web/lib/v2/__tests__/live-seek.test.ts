import { describe, it, expect } from 'vitest';
import {
  clampSeek,
  getSeekableRange,
  seekToLive,
  seekToStart,
} from '../live-seek';

function mockSeekable(ranges: Array<{ start: number; end: number }>): TimeRanges {
  return {
    length: ranges.length,
    start: (i: number) => ranges[i]?.start ?? 0,
    end: (i: number) => ranges[i]?.end ?? 0,
  } as TimeRanges;
}

describe('getSeekableRange', () => {
  it('uses last seekable range when present', () => {
    const media = {
      seekable: mockSeekable([{ start: 120, end: 5000 }]),
      duration: Number.POSITIVE_INFINITY,
    };
    expect(getSeekableRange(media)).toEqual({ start: 120, end: 5000 });
  });

  it('falls back to finite duration when seekable is empty', () => {
    const media = { seekable: mockSeekable([]), duration: 600 };
    expect(getSeekableRange(media)).toEqual({ start: 0, end: 600 });
  });

  it('returns null when no seekable and infinite duration', () => {
    const media = { seekable: mockSeekable([]), duration: Infinity };
    expect(getSeekableRange(media)).toBeNull();
  });
});

describe('clampSeek', () => {
  it('clamps -30s inside seekable window', () => {
    expect(clampSeek(5000, -30, 120, 5100)).toBe(4970);
  });

  it('does not go below seekable start', () => {
    expect(clampSeek(150, -60, 120, 5100)).toBe(120);
  });

  it('does not exceed seekable end', () => {
    expect(clampSeek(5090, 30, 120, 5100)).toBe(5100);
  });
});

describe('seekToStart / seekToLive', () => {
  it('seekToStart returns seekable start (may be non-zero)', () => {
    expect(seekToStart(120)).toBe(120);
  });

  it('seekToLive returns finite seekable end', () => {
    expect(seekToLive(5100)).toBe(5100);
    expect(Number.isFinite(seekToLive(5100))).toBe(true);
  });
});
