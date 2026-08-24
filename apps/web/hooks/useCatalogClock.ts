'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  sportRegistry,
  PeriodLabeler,
  seedClockSeconds,
  resolveClockSeconds,
  formatClock,
} from '@fieldview/data-model';
import type { ClockMode } from '@fieldview/data-model';

type ClockStatus = 'stopped' | 'running' | 'paused';

export interface UseCatalogClockReturn {
  /** Formatted clock string, e.g. `"12:00"` or `"00:00"`. */
  time: string;
  /** Human-readable period label, e.g. `"1st Half"` or `"Q1"`. */
  period: string;
  /** Clock direction from the sport catalog. */
  clockMode: ClockMode;
  /** True when the sport has no game clock (baseball, volleyball). */
  hideClock: boolean;
  start(): void;
  pause(): void;
  reset(): void;
}

const periodLabeler = new PeriodLabeler(sportRegistry);

interface ClockState {
  status: ClockStatus;
  clockSeconds: number;
  clockStartedAt: Date | null;
}

/**
 * Local (no-API) clock driven by the sport catalog.
 * Wraps seedClockSeconds / resolveClockSeconds / formatClock.
 * Intended for demo pages and SocialProducerPanel display.
 */
export function useCatalogClock(sportId: string): UseCatalogClockReturn {
  const sport = sportRegistry.getSport(sportId);
  const clockMode = sport.clock.mode;
  const hideClock = clockMode === 'none';

  const [state, setState] = useState<ClockState>(() => ({
    status: 'stopped',
    clockSeconds: seedClockSeconds(sport),
    clockStartedAt: null,
  }));

  // Keep a ref so callbacks always read the latest state without stale closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sportIdRef = useRef(sportId);

  // Re-seed when sportId changes
  useEffect(() => {
    if (sportIdRef.current !== sportId) {
      sportIdRef.current = sportId;
      const newSport = sportRegistry.getSport(sportId);
      setState({
        status: 'stopped',
        clockSeconds: seedClockSeconds(newSport),
        clockStartedAt: null,
      });
    }
  }, [sportId]);

  // Tick every second while running to trigger re-renders
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => {
      setState((prev) => ({ ...prev }));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'running',
      clockStartedAt: new Date(),
    }));
  }, []);

  const pause = useCallback(() => {
    const { status, clockSeconds, clockStartedAt } = stateRef.current;
    const mode = sportRegistry.getSport(sportIdRef.current).clock.mode;
    const snapped = resolveClockSeconds({
      mode: status,
      clockDirection: mode,
      clockSeconds,
      clockStartedAt,
      now: new Date(),
    });
    setState({
      status: 'paused',
      clockSeconds: snapped,
      clockStartedAt: null,
    });
  }, []);

  const reset = useCallback(() => {
    const newSport = sportRegistry.getSport(sportIdRef.current);
    setState({
      status: 'stopped',
      clockSeconds: seedClockSeconds(newSport),
      clockStartedAt: null,
    });
  }, []);

  const displaySeconds = resolveClockSeconds({
    mode: state.status,
    clockDirection: clockMode,
    clockSeconds: state.clockSeconds,
    clockStartedAt: state.clockStartedAt,
    now: new Date(),
  });

  const time = formatClock(displaySeconds);
  const period = periodLabeler.formatPeriod(sportId, 1);

  return { time, period, clockMode, hideClock, start, pause, reset };
}
