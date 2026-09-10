import { describe, it, expect } from 'vitest';

import { seedClockSeconds, resolveClockSeconds, formatClock } from '../clock';
import { baseballConfig } from '../configs/baseball';
import { basketballConfig } from '../configs/basketball';
import { footballConfig } from '../configs/football';
import { hockeyConfig } from '../configs/hockey';
import { soccerConfig } from '../configs/soccer';

describe('seedClockSeconds', () => {
  it('football (down, 720s) → 720', () => {
    expect(seedClockSeconds(footballConfig)).toBe(720);
  });

  it('basketball (down, 480s) → 480', () => {
    expect(seedClockSeconds(basketballConfig)).toBe(480);
  });

  it('hockey (down, 1200s) → 1200', () => {
    expect(seedClockSeconds(hockeyConfig)).toBe(1200);
  });

  it('soccer (up) → 0', () => {
    expect(seedClockSeconds(soccerConfig)).toBe(0);
  });

  it('baseball (none) → 0', () => {
    expect(seedClockSeconds(baseballConfig)).toBe(0);
  });
});

describe('resolveClockSeconds', () => {
  const startedAt = new Date('2026-08-21T00:00:00.000Z');
  const now30 = new Date('2026-08-21T00:00:30.000Z'); // 30s elapsed

  it('soccer up — running adds elapsed', () => {
    expect(
      resolveClockSeconds({
        mode: 'running',
        clockDirection: 'up',
        clockSeconds: 100,
        clockStartedAt: startedAt,
        now: now30,
      })
    ).toBe(130);
  });

  it('football down — running subtracts elapsed', () => {
    expect(
      resolveClockSeconds({
        mode: 'running',
        clockDirection: 'down',
        clockSeconds: 720,
        clockStartedAt: startedAt,
        now: now30,
      })
    ).toBe(690);
  });

  it('football down — clamps at 0 when elapsed exceeds remaining', () => {
    const nowWayLater = new Date('2026-08-21T00:20:00.000Z'); // 20 min elapsed
    expect(
      resolveClockSeconds({
        mode: 'running',
        clockDirection: 'down',
        clockSeconds: 60,
        clockStartedAt: startedAt,
        now: nowWayLater,
      })
    ).toBe(0);
  });

  it('baseball none — running returns base unchanged', () => {
    expect(
      resolveClockSeconds({
        mode: 'running',
        clockDirection: 'none',
        clockSeconds: 0,
        clockStartedAt: startedAt,
        now: now30,
      })
    ).toBe(0);
  });

  it('paused snapshot — returns clockSeconds unchanged', () => {
    expect(
      resolveClockSeconds({
        mode: 'paused',
        clockDirection: 'down',
        clockSeconds: 345,
        clockStartedAt: null,
      })
    ).toBe(345);
  });

  it('stopped — returns clockSeconds unchanged', () => {
    expect(
      resolveClockSeconds({
        mode: 'stopped',
        clockDirection: 'up',
        clockSeconds: 0,
        clockStartedAt: null,
      })
    ).toBe(0);
  });

  it('accepts ISO string for clockStartedAt', () => {
    expect(
      resolveClockSeconds({
        mode: 'running',
        clockDirection: 'up',
        clockSeconds: 0,
        clockStartedAt: '2026-08-21T00:00:00.000Z',
        now: now30,
      })
    ).toBe(30);
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds with zero-padding', () => {
    expect(formatClock(720)).toBe('12:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(3600)).toBe('60:00');
  });

  it('preserves negative sign for overtime negatives', () => {
    expect(formatClock(-5)).toBe('-00:05');
  });
});
