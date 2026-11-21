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
import { InlineScoreField } from './InlineScoreField';
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
  /** Tap the clock to set the linesman time. */
  onEditClock?: () => void;
  /** Commit a score when viewer editing is allowed. */
  onCommitScore?: (team: 'home' | 'away', score: number) => void | Promise<void>;
  variant: 'overlay' | 'bar';
  className?: string;
}

function teamAbbr(team: TeamData): string {
  return (team.abbreviation || team.name).slice(0, 3).toUpperCase();
}

const SCORE_INK = '#FFFFFF';

function JerseyPatch({ color }: { color: string }) {
  return (
    <span
      data-testid="jersey-patch"
      aria-hidden
      className="inline-block w-2.5 h-2.5 rounded-[2px] border border-white/80 shrink-0"
      style={{ backgroundColor: color }}
    />
  );
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
  onEditClock,
  onCommitScore,
}: {
  homeTeam: TeamData;
  awayTeam: TeamData;
  period: string | undefined;
  time: string | undefined;
  hideClock: boolean;
  crowdsource: SportScoreLineProps['crowdsource'];
  onEditClock?: () => void;
  onCommitScore?: (team: 'home' | 'away', score: number) => void | Promise<void>;
}) {
  const reporting = crowdsource?.enabled === true;
  const homeAbbr = teamAbbr(homeTeam);
  const awayAbbr = teamAbbr(awayTeam);
  const showClock = !hideClock && Boolean(time);
  const clockText = showClock ? time : (!period && !hideClock ? '--:--' : null);
  const clockNode = clockText ? (
    onEditClock ? (
      <button
        type="button"
        data-testid="btn-overlay-clock"
        aria-label="Set match clock"
        onClick={(e) => stopAnd(e, onEditClock)}
        className="tabular-nums font-mono text-xs rounded px-0.5 hover:bg-white/15"
      >
        <span data-testid="overlay-clock">{clockText}</span>
      </button>
    ) : (
      <span data-testid="overlay-clock" className="tabular-nums font-mono text-xs">
        {clockText}
      </span>
    )
  ) : null;

  const periodClockContent = (
    <>
      {period && (
        <span data-testid="overlay-period" className="font-medium">
          {period}
        </span>
      )}
      {clockNode}
    </>
  );

  return (
    <>
      {reporting && onEditClock ? (
        <span className="flex items-center gap-1 shrink-0 mr-3 whitespace-nowrap text-white/90">
          {period && (
            <button
              type="button"
              data-testid="btn-overlay-period"
              aria-label="Report a period event"
              onClick={(e) => stopAnd(e, crowdsource.onTapPeriod)}
              className="rounded px-0.5 hover:bg-white/15"
            >
              <span data-testid="overlay-period" className="font-medium">{period}</span>
            </button>
          )}
          {clockNode}
        </span>
      ) : reporting ? (
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

      {reporting && !onCommitScore ? (
        <button
          type="button"
          data-testid="btn-overlay-team-home"
          aria-label={`Report scoring for ${homeTeam.name}`}
          onClick={(e) => stopAnd(e, () => crowdsource.onTapTeam('home'))}
          className="flex items-center gap-1.5 shrink-0 rounded px-0.5 hover:bg-white/15"
        >
          <span>{homeAbbr}</span>
          <JerseyPatch color={homeTeam.color} />
          <span className="tabular-nums text-white">{homeTeam.score}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span>{homeAbbr}</span>
          <JerseyPatch color={homeTeam.color} />
          {onCommitScore ? (
            <InlineScoreField
              value={homeTeam.score}
              color={SCORE_INK}
              commit={(score) => onCommitScore('home', score)}
              aria-label={`Edit score for ${homeTeam.name}`}
            />
          ) : (
            <span className="tabular-nums text-white">{homeTeam.score}</span>
          )}
        </div>
      )}

      <span className="mx-2 shrink-0">-</span>

      {reporting && !onCommitScore ? (
        <button
          type="button"
          data-testid="btn-overlay-team-away"
          aria-label={`Report scoring for ${awayTeam.name}`}
          onClick={(e) => stopAnd(e, () => crowdsource.onTapTeam('away'))}
          className="flex items-center gap-1.5 shrink-0 rounded px-0.5 hover:bg-white/15"
        >
          <span className="tabular-nums text-white">{awayTeam.score}</span>
          <span>{awayAbbr}</span>
          <JerseyPatch color={awayTeam.color} />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          {onCommitScore ? (
            <InlineScoreField
              value={awayTeam.score}
              color={SCORE_INK}
              commit={(score) => onCommitScore('away', score)}
              aria-label={`Edit score for ${awayTeam.name}`}
            />
          ) : (
            <span className="tabular-nums text-white">{awayTeam.score}</span>
          )}
          <span>{awayAbbr}</span>
          <JerseyPatch color={awayTeam.color} />
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
            <span className="text-xs font-semibold tracking-wide">{homeAbbr}</span>
            <JerseyPatch color={homeTeam.color} />
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
            <JerseyPatch color={awayTeam.color} />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wide">{homeAbbr}</span>
            <JerseyPatch color={homeTeam.color} />
          </div>
          <span className="font-bold text-lg tabular-nums leading-none">{homeTeam.score}</span>
          <span className="text-[var(--fv-color-text-muted)] text-xs">-</span>
          <span className="font-bold text-lg tabular-nums leading-none">{awayTeam.score}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wide">{awayAbbr}</span>
            <JerseyPatch color={awayTeam.color} />
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
  onEditClock,
  onCommitScore,
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
          onEditClock={onEditClock}
          onCommitScore={onCommitScore}
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
