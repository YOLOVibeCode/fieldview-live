export interface SeekableRange {
  start: number;
  end: number;
}

type SeekableMedia = Pick<HTMLMediaElement, 'seekable' | 'duration'>;

type VidstackSeekableSource = {
  seekable?: TimeRanges;
  duration?: number;
  seekableStart?: number;
  seekableEnd?: number;
};

/** Read HTMLMediaElement seekable range, with finite-duration fallback. */
export function getSeekableRange(media: SeekableMedia): SeekableRange | null {
  const { seekable, duration } = media;
  if (seekable.length > 0) {
    const start = seekable.start(0);
    const end = seekable.end(seekable.length - 1);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return { start, end };
    }
  }
  if (Number.isFinite(duration) && duration > 0) {
    return { start: 0, end: duration };
  }
  return null;
}

/** Vidstack MediaPlayerInstance seekable window (live DVR). */
export function getVidstackSeekableRange(
  player: VidstackSeekableSource
): SeekableRange | null {
  if (player.seekable && player.seekable.length > 0) {
    const fromMedia = getSeekableRange({
      seekable: player.seekable,
      duration: player.duration ?? Number.NaN,
    });
    if (fromMedia) return fromMedia;
  }
  const start = player.seekableStart;
  const end = player.seekableEnd;
  if (
    start !== undefined &&
    end !== undefined &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end >= start
  ) {
    return { start, end };
  }
  return null;
}

export function clampSeek(
  current: number,
  delta: number,
  seekableStart: number,
  seekableEnd: number
): number {
  const cur = Number.isFinite(current) ? current : seekableStart;
  const target = cur + delta;
  return Math.max(seekableStart, Math.min(target, seekableEnd));
}

export function seekToStart(seekableStart: number): number {
  return seekableStart;
}

export function seekToLive(seekableEnd: number): number {
  return seekableEnd;
}
