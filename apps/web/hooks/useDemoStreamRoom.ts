'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  sportRegistry,
  PeriodLabeler,
  resolveClockSeconds,
  formatClock,
} from '@fieldview/data-model';
import type { ClockMode } from '@fieldview/data-model';
import type { DemoStreamRoom, DemoStreamSnapshot } from '@/lib/demo/DemoStreamRoom';

const periodLabeler = new PeriodLabeler(sportRegistry);

export interface UseDemoStreamRoomReturn extends DemoStreamSnapshot {
  viewerId: string;
  time: string;
  periodLabel: string;
  clockMode: ClockMode;
  hideClock: boolean;
  setPlaybackSrc(src: string): void;
  setSport(sportId: string): void;
  startClock(): void;
  pauseClock(): void;
  resetClock(): void;
  report(eventTypeId: string, team?: 'home' | 'away'): void;
  confirm(eventId: string): void;
}

/**
 * Subscribe a viewer instance to a shared DemoStreamRoom.
 * Clock display is derived locally so both panels tick the same stored start time.
 */
export function useDemoStreamRoom(
  room: DemoStreamRoom,
  viewerId: string
): UseDemoStreamRoomReturn {
  const [snap, setSnap] = useState<DemoStreamSnapshot>(() => room.getSnapshot());
  const [, setTick] = useState(0);

  useEffect(() => {
    return room.subscribe(() => setSnap(room.getSnapshot()));
  }, [room]);

  useEffect(() => {
    if (snap.clockStatus !== 'running') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [snap.clockStatus]);

  const sport = sportRegistry.getSport(snap.sportId);
  const clockMode = sport.clock.mode;
  const hideClock = clockMode === 'none';

  const displaySeconds = resolveClockSeconds({
    mode: snap.clockStatus,
    clockDirection: clockMode,
    clockSeconds: snap.clockSeconds,
    clockStartedAt: snap.clockStartedAt,
    now: new Date(),
  });

  const setPlaybackSrc = useCallback(
    (src: string) => room.setPlaybackSrc(src, viewerId),
    [room, viewerId]
  );
  const setSport = useCallback((sportId: string) => room.setSport(sportId, viewerId), [room, viewerId]);
  const startClock = useCallback(() => room.startClock(viewerId), [room, viewerId]);
  const pauseClock = useCallback(() => room.pauseClock(viewerId), [room, viewerId]);
  const resetClock = useCallback(() => room.resetClock(viewerId), [room, viewerId]);
  const report = useCallback(
    (eventTypeId: string, team?: 'home' | 'away') => room.report(viewerId, eventTypeId, team),
    [room, viewerId]
  );
  const confirm = useCallback((eventId: string) => room.confirm(viewerId, eventId), [room, viewerId]);

  return {
    ...snap,
    viewerId,
    time: formatClock(displaySeconds),
    periodLabel: periodLabeler.formatPeriod(snap.sportId, snap.period),
    clockMode,
    hideClock,
    setPlaybackSrc,
    setSport,
    startClock,
    pauseClock,
    resetClock,
    report,
    confirm,
  };
}
