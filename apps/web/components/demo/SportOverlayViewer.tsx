'use client';

/**
 * One viewer instance of the sport overlay PoC.
 * Local UI (sheet, expand) is per-panel; stream state comes from DemoStreamRoom.
 */

import { useState } from 'react';
import { sportRegistry } from '@fieldview/data-model';
import { MiniScoreOverlay } from '@/components/v2/scoreboard/MiniScoreOverlay';
import { CompactScoreBar } from '@/components/v2/scoreboard/CompactScoreBar';
import { ReportEventSheet } from '@/components/v2/chat/ReportEventSheet';
import { useDemoStreamRoom } from '@/hooks/useDemoStreamRoom';
import type { DemoStreamRoom } from '@/lib/demo/DemoStreamRoom';

type SheetTarget = { team?: 'home' | 'away'; category?: 'scoring' | 'period' | 'hype' } | null;

export interface SportOverlayViewerProps {
  room: DemoStreamRoom;
  viewerId: string;
  label?: string;
  panelTestId?: string;
}

export function SportOverlayViewer({
  room,
  viewerId,
  label,
  panelTestId,
}: SportOverlayViewerProps) {
  const stream = useDemoStreamRoom(room, viewerId);
  const [sheetTarget, setSheetTarget] = useState<SheetTarget>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const sports = sportRegistry.listSports();
  const homeTeam = { name: 'Home', score: stream.homeScore, color: '#3B82F6' };
  const awayTeam = { name: 'Away', score: stream.awayScore, color: '#EF4444' };

  const tapHandlers = {
    enabled: true as const,
    viewerId: stream.viewerId,
    onTapTeam: (team: 'home' | 'away') =>
      setSheetTarget({ team, category: 'scoring' }),
    onTapPeriod: () => setSheetTarget({ category: 'period' }),
    onConfirmPending: (eventId: string) => stream.confirm(eventId),
  };

  const overlayCrowdsource = {
    ...tapHandlers,
    pendingEvent: stream.pendingEvent,
  };

  const barCrowdsource = {
    ...tapHandlers,
    pendingEvent: null,
  };

  return (
    <div
      className="flex flex-col gap-3"
      data-testid={panelTestId}
    >
      {label && (
        <div className="flex items-center justify-between gap-2">
          <span
            data-testid="channel-label"
            className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
          >
            {label}
          </span>
          <span className="truncate text-[11px] text-white/40" data-testid="channel-viewer-id">
            {viewerId}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3" data-testid="demo-controls">
        <div className="flex flex-col gap-1">
          <label htmlFor={`sport-select-${viewerId}`} className="text-xs text-white/60">
            Sport
          </label>
          <select
            id={`sport-select-${viewerId}`}
            data-testid="dropdown-sport"
            value={stream.sportId}
            onChange={(e) => stream.setSport(e.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white"
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          {stream.clockMode !== 'none' && (
            <>
              <button
                type="button"
                data-testid="btn-clock-start"
                onClick={stream.startClock}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                ▶ Start
              </button>
              <button
                type="button"
                data-testid="btn-clock-pause"
                onClick={stream.pauseClock}
                className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
              >
                ⏸ Pause
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="btn-clock-reset"
            onClick={stream.resetClock}
            className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
          >
            ↺ Reset
          </button>
        </div>

        <div className="text-xs text-white/50">
          Mode: <span data-testid="debug-clock-mode">{stream.clockMode}</span>
          {' | '}
          Clock: <span data-testid="debug-clock-time">{stream.time}</span>
          {' | '}
          Period: <span data-testid="debug-period">{stream.periodLabel}</span>
          {' | '}
          Score: <span data-testid="debug-home-score">{stream.homeScore}</span>
          -
          <span data-testid="debug-away-score">{stream.awayScore}</span>
        </div>
      </div>

      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm select-none">
          ▶ {label ?? 'Film'} (no video required)
        </div>

        <MiniScoreOverlay
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          period={stream.periodLabel}
          time={stream.hideClock ? undefined : stream.time}
          sportId={stream.sportId}
          crowdsource={overlayCrowdsource}
        />
      </div>

      <CompactScoreBar
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        period={stream.periodLabel}
        time={stream.hideClock ? undefined : stream.time}
        sportId={stream.sportId}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((v) => !v)}
        crowdsource={barCrowdsource}
      />

      <ReportEventSheet
        isOpen={sheetTarget !== null}
        onClose={() => setSheetTarget(null)}
        sportId={stream.sportId}
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        onReport={(eventTypeId, team) => {
          stream.report(eventTypeId, team);
          setSheetTarget(null);
        }}
        category={sheetTarget?.category}
        preselectedTeam={sheetTarget?.team}
      />
    </div>
  );
}
