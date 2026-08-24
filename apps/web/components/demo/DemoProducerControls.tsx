'use client';

/**
 * Shared sport + clock controls for overlay PoCs.
 * One instance per page — not per channel.
 */

import { sportRegistry } from '@fieldview/data-model';
import type { UseDemoStreamRoomReturn } from '@/hooks/useDemoStreamRoom';

export interface DemoProducerControlsProps {
  stream: UseDemoStreamRoomReturn;
  selectId?: string;
}

export function DemoProducerControls({
  stream,
  selectId = 'sport-select',
}: DemoProducerControlsProps) {
  const sports = sportRegistry.listSports();

  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="demo-producer-controls">
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-xs text-white/60">
          Sport overlay
        </label>
        <select
          id={selectId}
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
    </div>
  );
}
