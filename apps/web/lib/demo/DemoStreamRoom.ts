/**
 * In-memory shared stream for the multi-channel overlay PoC.
 * Both viewer panels subscribe to one room; mutations from either notify both.
 */

import {
  sportRegistry,
  seedClockSeconds,
  resolveClockSeconds,
  ScoreDeltaCalculator,
} from '@fieldview/data-model';
import type { ClockMode, EventCategory, ScoreAppliesTo } from '@fieldview/data-model';
import { DEFAULT_DEMO_STREAM } from './resolveDemoStream';

export type ClockStatus = 'stopped' | 'running' | 'paused';

export interface DemoPendingEvent {
  id: string;
  eventTypeId: string;
  label: string;
  team: 'home' | 'away' | null;
  confirmationCount: number;
  confirmationNeeded: number;
  reportedByViewerId: string;
  pointsDelta: number;
  scoreAppliesTo: ScoreAppliesTo;
  category: EventCategory;
  advancesPeriod: boolean;
}

export interface DemoStreamSnapshot {
  playbackSrc: string;
  sportId: string;
  period: number;
  homeScore: number;
  awayScore: number;
  clockStatus: ClockStatus;
  clockSeconds: number;
  clockStartedAt: Date | null;
  pendingEvent: DemoPendingEvent | null;
  lastAction: string | null;
}

type Listener = () => void;

const scoreDelta = new ScoreDeltaCalculator();
let nextEventId = 1;

function initialSnapshot(): DemoStreamSnapshot {
  return {
    playbackSrc: DEFAULT_DEMO_STREAM,
    sportId: 'soccer',
    period: 1,
    homeScore: 0,
    awayScore: 0,
    clockStatus: 'stopped',
    clockSeconds: seedClockSeconds(sportRegistry.getSport('soccer')),
    clockStartedAt: null,
    pendingEvent: null,
    lastAction: null,
  };
}

export class DemoStreamRoom {
  private snapshot: DemoStreamSnapshot;
  private readonly listeners = new Set<Listener>();
  /** Extra confirms beyond the reporter. 1 → needed = 2. */
  constructor(private readonly extraConfirms = 1) {
    this.snapshot = initialSnapshot();
  }

  getSnapshot(): DemoStreamSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setPlaybackSrc(src: string, actor: string): void {
    this.commit({ playbackSrc: src }, `${actor} loaded stream`);
  }

  setSport(sportId: string, actor: string): void {
    const sport = sportRegistry.getSport(sportId);
    this.commit(
      {
        sportId,
        period: 1,
        homeScore: 0,
        awayScore: 0,
        clockStatus: 'stopped',
        clockSeconds: seedClockSeconds(sport),
        clockStartedAt: null,
        pendingEvent: null,
      },
      `${actor} set sport to ${sport.displayName}`
    );
  }

  startClock(actor: string): void {
    const { clockStatus, clockSeconds } = this.snapshot;
    if (clockStatus === 'running') return;
    this.commit(
      {
        clockStatus: 'running',
        clockStartedAt: new Date(),
        clockSeconds,
      },
      `${actor} started the clock`
    );
  }

  pauseClock(actor: string): void {
    const { clockStatus, clockSeconds, clockStartedAt, sportId } = this.snapshot;
    if (clockStatus !== 'running') return;
    const mode: ClockMode = sportRegistry.getSport(sportId).clock.mode;
    const snapped = resolveClockSeconds({
      mode: 'running',
      clockDirection: mode,
      clockSeconds,
      clockStartedAt,
      now: new Date(),
    });
    this.commit(
      {
        clockStatus: 'paused',
        clockSeconds: snapped,
        clockStartedAt: null,
      },
      `${actor} paused the clock`
    );
  }

  resetClock(actor: string): void {
    const sport = sportRegistry.getSport(this.snapshot.sportId);
    this.commit(
      {
        clockStatus: 'stopped',
        clockSeconds: seedClockSeconds(sport),
        clockStartedAt: null,
      },
      `${actor} reset the clock`
    );
  }

  report(viewerId: string, eventTypeId: string, team?: 'home' | 'away'): void {
    const eventType = sportRegistry.getEventType(this.snapshot.sportId, eventTypeId);
    const teamSide = team ?? null;

    if (!eventType.requiresConfirmation) {
      this.commit({}, `${viewerId} posted ${eventType.label}`);
      return;
    }

    if (this.snapshot.pendingEvent) {
      this.commit({}, `${viewerId} report ignored — event already pending`);
      return;
    }

    const pending: DemoPendingEvent = {
      id: `evt-${nextEventId++}`,
      eventTypeId,
      label: eventType.label,
      team: eventType.teamScoped ? teamSide : null,
      confirmationCount: 1,
      confirmationNeeded: 1 + this.extraConfirms,
      reportedByViewerId: viewerId,
      pointsDelta: eventType.pointsDelta,
      scoreAppliesTo: eventType.scoreAppliesTo,
      category: eventType.category,
      advancesPeriod: eventType.advancesPeriod,
    };

    this.commit(
      { pendingEvent: pending },
      `${viewerId} reported ${eventType.label}${team ? ` (${team})` : ''}`
    );
  }

  confirm(viewerId: string, eventId: string): void {
    const pending = this.snapshot.pendingEvent;
    if (!pending || pending.id !== eventId) return;
    if (viewerId === pending.reportedByViewerId) return;

    const nextCount = pending.confirmationCount + 1;
    if (nextCount < pending.confirmationNeeded) {
      this.commit(
        { pendingEvent: { ...pending, confirmationCount: nextCount } },
        `${viewerId} confirmed ${pending.label} (${nextCount}/${pending.confirmationNeeded})`
      );
      return;
    }

    let homeScore = this.snapshot.homeScore;
    let awayScore = this.snapshot.awayScore;
    let period = this.snapshot.period;

    if (pending.category === 'scoring' && pending.pointsDelta > 0) {
      const eventType = sportRegistry.getEventType(this.snapshot.sportId, pending.eventTypeId);
      const delta = scoreDelta.resolveScoreDelta(eventType, pending.team);
      homeScore += delta.homeDelta;
      awayScore += delta.awayDelta;
    }

    if (pending.advancesPeriod) {
      period += 1;
    }

    this.commit(
      { homeScore, awayScore, period, pendingEvent: null },
      `${viewerId} confirmed ${pending.label} — applied`
    );
  }

  private commit(partial: Partial<DemoStreamSnapshot>, lastAction: string): void {
    this.snapshot = { ...this.snapshot, ...partial, lastAction };
    this.listeners.forEach((listener) => listener());
  }
}
