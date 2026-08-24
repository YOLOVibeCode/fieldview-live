'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameEventPayload } from '@fieldview/data-model';
import { sportRegistry } from '@fieldview/data-model';
import { SportEventIcon } from '@/components/v2/scoreboard/SportEventIcon';

interface PlayByPlayFeedProps {
  slug: string;
  sportId: string;
  homeTeamName: string;
  awayTeamName: string;
  /** Latest confirmed event from SSE (latestGameEvent). Feed merges it in live. */
  latestEvent?: GameEventPayload | null;
}

interface PeriodGroup {
  periodLabel: string;
  plays: GameEventPayload[];
}

function groupByPeriod(events: GameEventPayload[], sportId: string): PeriodGroup[] {
  const sport = (() => {
    try {
      return sportRegistry.getSport(sportId);
    } catch {
      return sportRegistry.getSport('generic');
    }
  })();

  const groups = new Map<string, GameEventPayload[]>();
  const order: string[] = [];

  for (const ev of events) {
    const label = ev.periodLabel ?? sport.periods.labelFor(1);
    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }
    groups.get(label)!.push(ev);
  }

  // Most recent period first
  return order.reverse().map((label) => ({
    periodLabel: label,
    plays: groups.get(label)!,
  }));
}

function teamLabel(
  event: GameEventPayload,
  homeTeamName: string,
  awayTeamName: string
): string | null {
  if (!event.team) return null;
  return event.team === 'home' ? homeTeamName : awayTeamName;
}

function clockLabel(clockSeconds: number | null | undefined): string | null {
  if (clockSeconds == null) return null;
  const m = Math.floor(clockSeconds / 60);
  const s = clockSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayByPlayFeed({
  slug,
  sportId,
  homeTeamName,
  awayTeamName,
  latestEvent,
}: PlayByPlayFeedProps) {
  const [plays, setPlays] = useState<GameEventPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap from GET /:slug/events
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/direct/${encodeURIComponent(slug)}/events?status=confirmed`)
      .then((r) => r.json())
      .then((data: { events?: GameEventPayload[] }) => {
        if (!cancelled) {
          const events = (data.events ?? []).filter(
            (e) => e.category === 'scoring' || e.category === 'period'
          );
          setPlays(events);
        }
      })
      .catch(() => {
        if (!cancelled) setPlays([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Merge live events from SSE into the list
  useEffect(() => {
    if (!latestEvent) return;
    if (latestEvent.category === 'hype') return;

    setPlays((prev) => {
      const idx = prev.findIndex((p) => p.id === latestEvent.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = latestEvent;
        return next;
      }
      if (latestEvent.status === 'confirmed') {
        return [latestEvent, ...prev];
      }
      return prev;
    });
  }, [latestEvent]);

  const groups = useMemo(() => groupByPeriod(plays, sportId), [plays, sportId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="plays-loading">
        <p className="text-sm text-white/40">Loading plays…</p>
      </div>
    );
  }

  if (plays.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center"
        data-testid="plays-empty"
      >
        <p className="text-sm text-white/50">No plays yet.</p>
        <p className="text-xs text-white/30">Accepted events will appear here.</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-[var(--fv-color-bg-primary)]"
      data-testid="plays-feed"
    >
      {groups.map((group) => (
        <div key={group.periodLabel} data-testid={`plays-group-${group.periodLabel}`}>
          {/* Period header */}
          <div className="sticky top-0 z-10 bg-[var(--fv-color-bg-secondary)]/95 px-4 py-1.5 border-b border-[var(--fv-color-border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              {group.periodLabel}
            </span>
          </div>

          {/* Plays in this period */}
          <div className="divide-y divide-[var(--fv-color-border)]">
            {group.plays.map((play) => {
              const clock = clockLabel(play.clockSeconds);
              const team = teamLabel(play, homeTeamName, awayTeamName);

              return (
                <div
                  key={play.id}
                  data-testid={`play-row-${play.id}`}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div className="mt-0.5 shrink-0 text-white/60">
                    <SportEventIcon name={play.icon} className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Narration or label */}
                    <p
                      className="text-sm font-medium text-white leading-snug"
                      data-testid={`play-narration-${play.id}`}
                    >
                      {play.narration ?? play.label}
                      {team && !play.narration && (
                        <span className="text-white/60"> — {team}</span>
                      )}
                    </p>

                    {/* Note */}
                    {play.note && (
                      <p
                        className="text-xs text-white/50 mt-0.5 truncate"
                        data-testid={`play-note-${play.id}`}
                      >
                        {play.note}
                      </p>
                    )}

                    {/* Meta: reporter + clock */}
                    <p className="mt-0.5 text-[10px] text-white/30">
                      {play.displayName}
                      {clock && (
                        <span className="ml-1 font-mono">{clock}</span>
                      )}
                    </p>
                  </div>

                  {/* Status badge */}
                  {play.status === 'confirmed' ? (
                    <span
                      className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-400"
                      data-testid={`play-status-${play.id}`}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300"
                      data-testid={`play-status-${play.id}`}
                    >
                      {play.confirmationCount}/{play.confirmationNeeded}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
