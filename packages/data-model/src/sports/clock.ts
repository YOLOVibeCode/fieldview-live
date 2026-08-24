import type { ClockMode, ISportConfig } from './types';

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * Initial clockSeconds for a fresh period.
 * - `down`  → start at `defaultPeriodSeconds` (counts toward 0)
 * - `up`    → start at 0 (counts up)
 * - `none`  → 0 (no clock)
 */
export function seedClockSeconds(sport: ISportConfig): number {
  if (sport.clock.mode === 'down') {
    return sport.clock.defaultPeriodSeconds ?? 0;
  }
  return 0;
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

export interface ResolveClockInput {
  mode: 'stopped' | 'running' | 'paused';
  clockDirection: ClockMode;
  clockSeconds: number;
  clockStartedAt: Date | string | null;
  now?: Date;
}

/**
 * Compute the current display seconds from stored state.
 * - `stopped` / `paused` → return `clockSeconds` as-is
 * - `running` + `up`    → base + elapsed
 * - `running` + `down`  → max(0, base - elapsed)
 * - `running` + `none`  → base (no tick)
 */
export function resolveClockSeconds(input: ResolveClockInput): number {
  const { mode, clockDirection, clockSeconds, clockStartedAt, now = new Date() } = input;

  if (mode !== 'running' || !clockStartedAt) {
    return clockSeconds;
  }

  const startMs =
    typeof clockStartedAt === 'string'
      ? new Date(clockStartedAt).getTime()
      : clockStartedAt.getTime();
  const elapsed = Math.floor((now.getTime() - startMs) / 1000);

  if (clockDirection === 'up') return clockSeconds + elapsed;
  if (clockDirection === 'down') return Math.max(0, clockSeconds - elapsed);
  return clockSeconds; // 'none'
}

// ─── Format ───────────────────────────────────────────────────────────────────

/**
 * Format clock seconds as `MM:SS` with optional leading minus for negatives.
 */
export function formatClock(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const sign = totalSeconds < 0 ? '-' : '';
  return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
