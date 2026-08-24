/**
 * SportScoreLine — sport-aware inner score row shared by MiniScoreOverlay and CompactScoreBar.
 *
 * Derives clock visibility from the sport catalog:
 *   - clock.mode === 'none'  → no clock slot (baseball, volleyball)
 *   - clock.mode !== 'none'  → period + MM:SS
 *
 * Shells keep their chrome (dismiss/restore, pending chip, expand chevron);
 * this component owns only the score/period/clock row.
 */

'use client';

import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { sportRegistry } from '@fieldview/data-model';
import type { TeamData } from './Scoreboard';
import type { OverlayCrowdsourceProps } from './overlayCrowdsource';

function stopAnd(e: MouseEvent, fn?: () => void) {
  e.stopPropagation();
  fn?.();
}

export interface SportScoreLineProps {
  sportId?: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  period?: string;
  time?: string;
  crowdsource?: Pick<OverlayCrowdsourceProps, 'enabled' | 'onTapTeam' | 'onTapPeriod'>;
  variant: 'overlay' | 'bar';
  className?: string;
}

function teamAbbr(team: TeamData): string {
  return (team.abbreviation || team.name).slice(0, 3).toUpperCase();
}

function resolveHideClock(sportId: string | undefined): boolean {
  if (!sportId) return false;
  try {
    return sportRegistry.getSport(sportId).clock.mode === 'none';
  } catch {
    return false;
  }
}

// ─── Overlay variant ──────────────────────────────────────────────────────────

function OverlayScoreLine({
  homeTeam,
  awayTeam,
  period,
  time,
  hideClock,
  crowdsource,
}: {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period: string | undefined;
  time: string | undefined;
  hideClock: boolean;
  crowdsource: SportScoreLineProps['crowdsource'];
}) {
  const reporting = crowdsource?.enabled === true;
  const homeAbbr = teamAbbr(homeTeam);
  const awayAbbr = teamAbbr(awayTeam);
  const showClock = !hideClock && Boolean(time);

  const periodClockContent = (
    <>
      {period && (
        <span data-testid="overlay-period" className="font-medium">
          {period}
        </span>
      )}
      {showClock && (
        <span data-testid="overlay-clock" className="tabular-nums font-mono text-xs">
          {time}
        </span>
      )}
      {!period && !showClock && !hideClock && (
        <span data-testid="overlay-clock" className="tabular-nums font-mono text-xs">
          --:--
        </span>
      )}
    </>
  );

  return (
    <>
      {reporting ? (
        <button
          type="button"
          data-testid="btn-overlay-period"
          aria-label="Report a period event"
          onClick={(e) => stopAnd(e, crowdsource.onTapPeriod)}
          className="flex items-center gap-1 shrink-0 mr-3 whitespace-nowrap text-white/90 rounded px-0.5 hover:bg-white/15"
        >
          {periodClockContent}
        </button>
      ) : (
        <span className="flex items-center gap-1 shrink-0 mr-3 whitespace-nowrap text-white/90">
          {periodClockContent}
        </span>
      )}

      {reporting ? (
        <button
          type="button"
          data-testid="btn-overlay-team-home"
          aria-label={`Report scoring for ${homeTeam.name}`}
          onClick={(e) => stopAnd(e, () => crowdsource.onTapTeam('home'))}
          className="flex items-center gap-1.5 shrink-0 rounded px-0.5 hover:bg-white/15"
        >
          <span className="w-[3px] self-stretch shrink-0 rounded-sm" style={{ backgroundColor: homeTeam.color }} />
          <span>{homeAbbr}</span>
          <span className="tabular-nums">{homeTeam.score}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-[3px] self-stretch shrink-0 rounded-sm" style={{ backgroundColor: homeTeam.color }} />
          <span>{homeAbbr}</span>
          <span className="tabular-nums">{homeTeam.score}</span>
        </div>
      )}

      <span className="mx-2 shrink-0">-</span>

      {reporting ? (
        <button
          type="button"
          data-testid="btn-overlay-team-away"
          aria-label={`Report scoring for ${awayTeam.name}`}
          onClick={(e) => stopAnd(e, () => crowdsource.onTapTeam('away'))}
          className="flex items-center gap-1.5 shrink-0 rounded px-0.5 hover:bg-white/15"
        >
          <span className="tabular-nums">{awayTeam.score}</span>
          <span>{awayAbbr}</span>
          <span className="w-[3px] self-stretch shrink-0 rounded-sm" style={{ backgroundColor: awayTeam.color }} />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="tabular-nums">{awayTeam.score}</span>
          <span>{awayAbbr}</span>
          <span className="w-[3px] self-stretch shrink-0 rounded-sm" style={{ backgroundColor: awayTeam.color }} />
        </div>
      )}
    </>
  );
}

// ─── Bar variant ──────────────────────────────────────────────────────────────

function BarScoreLine({
  homeTeam,
  awayTeam,
  period,
  time,
  hideClock,
  crowdsource,
}: {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period: string | undefined;
  time: string | undefined;
  hideClock: boolean;
  crowdsource: SportScoreLineProps['crowdsource'];
}) {
  const reporting = crowdsource?.enabled === true;
  const homeAbbr = teamAbbr(homeTeam);
  const awayAbbr = teamAbbr(awayTeam);
  const showClock = !hideClock && Boolean(time);
  const showPeriodClock = Boolean(period || showClock);
  const showPeriodSlot = reporting || showPeriodClock;

  const periodClockContent = (
    <>
      {period && (
        <span data-testid="overlay-period" className="font-medium">
          {period}
        </span>
      )}
      {showClock && (
        <span data-testid="overlay-clock" className="font-mono tabular-nums">
          {time}
        </span>
      )}
    </>
  );

  return (
    <>
      {reporting ? (
        <>
          <button
            type="button"
            data-testid="btn-overlay-team-home"
            aria-label={`Report scoring for ${homeTeam.name}`}
            onClick={() => crowdsource.onTapTeam('home')}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--fv-color-bg-tertiary)]"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: homeTeam.color }} />
            <span className="text-xs font-semibold tracking-wide">{homeAbbr}</span>
            <span className="font-bold text-lg tabular-nums leading-none">{homeTeam.score}</span>
          </button>
          <span className="text-[var(--fv-color-text-muted)] text-xs">-</span>
          <button
            type="button"
            data-testid="btn-overlay-team-away"
            aria-label={`Report scoring for ${awayTeam.name}`}
            onClick={() => crowdsource.onTapTeam('away')}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-[var(--fv-color-bg-tertiary)]"
          >
            <span className="font-bold text-lg tabular-nums leading-none">{awayTeam.score}</span>
            <span className="text-xs font-semibold tracking-wide">{awayAbbr}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: awayTeam.color }} />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: homeTeam.color }} />
            <span className="text-xs font-semibold tracking-wide">{homeAbbr}</span>
          </div>
          <span className="font-bold text-lg tabular-nums leading-none">{homeTeam.score}</span>
          <span className="text-[var(--fv-color-text-muted)] text-xs">-</span>
          <span className="font-bold text-lg tabular-nums leading-none">{awayTeam.score}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wide">{awayAbbr}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: awayTeam.color }} />
          </div>
        </>
      )}

      {showPeriodSlot && (
        <>
          <div className="w-px h-5 bg-[var(--fv-color-border)] mx-2 shrink-0" />
          {reporting ? (
            <button
              type="button"
              data-testid="btn-overlay-period"
              aria-label="Report a period event"
              onClick={crowdsource.onTapPeriod}
              className="flex items-center gap-1.5 text-xs text-[var(--fv-color-text-secondary)] rounded px-1 py-0.5 hover:bg-[var(--fv-color-bg-tertiary)]"
            >
              {showPeriodClock ? periodClockContent : <span>--</span>}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[var(--fv-color-text-secondary)]">
              {periodClockContent}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function SportScoreLine({
  sportId,
  homeTeam,
  awayTeam,
  period,
  time,
  crowdsource,
  variant,
  className,
}: SportScoreLineProps) {
  const hideClock = resolveHideClock(sportId);

  if (variant === 'overlay') {
    return (
      <div className={cn('flex items-center w-full', className)}>
        <OverlayScoreLine
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={period}
          time={time}
          hideClock={hideClock}
          crowdsource={crowdsource}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      <BarScoreLine
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period={period}
        time={time}
        hideClock={hideClock}
        crowdsource={crowdsource}
      />
    </div>
  );
}
