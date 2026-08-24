/**
 * Sport Event Catalog — ISP Types & Interfaces
 *
 * Segregated into three narrow interfaces (max 5–7 members each):
 *   ISportRegistryReader  — look up sports and event types
 *   IScoreDeltaCalculator — translate a confirmed event into home/away deltas
 *   IPeriodLabeler        — format a period number into a human-readable label
 */

// ─── Primitive types ──────────────────────────────────────────────────────────

/** Whether an event scores points, advances the period, or is chat-only hype. */
export type EventCategory = 'scoring' | 'period' | 'hype';

/**
 * Which team's score is incremented when the event is confirmed.
 * - `selected_team` — the team the reporter picked (standard scoring)
 * - `opponent`      — the other team (own-goal, safety recipient)
 * - `none`          — no score change (period, hype)
 */
export type ScoreAppliesTo = 'selected_team' | 'opponent' | 'none';

export type TeamSide = 'home' | 'away';

/**
 * How the game clock runs for this sport.
 * - `up`   — count-up timer (soccer, generic)
 * - `down` — count-down timer (football, basketball, lacrosse, hockey)
 * - `none` — no game clock (baseball, volleyball)
 */
export type ClockMode = 'up' | 'down' | 'none';

// ─── Event detail options ─────────────────────────────────────────────────────

/**
 * An optional follow-up chip shown after the main event type is picked.
 * When `unit` is set, an integer input is shown alongside the chip.
 */
export interface IEventDetailOption {
  /** Machine-readable id, unique within this event type. E.g. `'run'`. */
  id: string;
  /** Display label. E.g. `'Run'`. */
  label: string;
  /** When set, a numeric input is shown. `'yards'` prompts a yard count. */
  unit?: 'yards';
}

// ─── Event type ───────────────────────────────────────────────────────────────

export interface ISportEventType {
  /** Machine-readable id, unique within a sport. E.g. `'touchdown'`. */
  id: string;
  /** Human-readable label shown in the report sheet. E.g. `'Touchdown'`. */
  label: string;
  /** Lucide icon name to render next to the event card. E.g. `'trophy'`. */
  icon: string;
  category: EventCategory;
  /** Points added to the appropriate team's score. 0 for period / hype events. */
  pointsDelta: number;
  scoreAppliesTo: ScoreAppliesTo;
  /**
   * When true the reporter must also pick Home or Away.
   * False for neutral events like `quarter_end`, `full_time`, `fight`.
   */
  teamScoped: boolean;
  /**
   * When true the event enters a `pending` state and waits for viewer
   * confirmations (or a producer resolve) before applying to the scoreboard.
   * Hype events skip confirmation and post to chat immediately.
   */
  requiresConfirmation: boolean;
  /** When true a confirmed event triggers SMS alerts to subscribed followers. */
  notifyWorthy: boolean;
  /** When true a confirmed period event increments the current period counter. */
  advancesPeriod: boolean;
  /**
   * Optional structured detail options shown in step 2 of the report sheet.
   * Empty or absent → two-tap path only (no detail step rendered).
   */
  detailOptions?: readonly IEventDetailOption[];
}

// ─── Period scheme ────────────────────────────────────────────────────────────

export interface IPeriodScheme {
  /** Normal period count (halves, quarters, innings, sets, etc.). */
  count: number;
  /** Label used when `period > count`, e.g. `'OT'` or `'Extra Time'`. */
  overtimeLabel: string;
  /** True for baseball, which tracks top / bottom of each inning. */
  supportsPeriodDetail: boolean;
  /**
   * Format a period number (1-based) into a display string.
   * @param period  1-based period index
   * @param detail  `'top'` | `'bottom'` | null — only meaningful when `supportsPeriodDetail`
   */
  labelFor(period: number, detail?: string | null): string;
}

// ─── Clock scheme ─────────────────────────────────────────────────────────────

export interface IClockScheme {
  mode: ClockMode;
  /**
   * Default length of a single period in seconds.
   * `null` when `mode === 'none'` (baseball, volleyball have no game clock).
   */
  defaultPeriodSeconds: number | null;
}

// ─── Sport config ─────────────────────────────────────────────────────────────

export interface ISportConfig {
  /** Machine-readable sport id, e.g. `'football'`. */
  id: string;
  /** Display name, e.g. `'American Football'`. */
  displayName: string;
  periods: IPeriodScheme;
  clock: IClockScheme;
  eventTypes: readonly ISportEventType[];
}

// ─── Segregated interfaces ────────────────────────────────────────────────────

/**
 * Read-only access to the sport registry.
 * Consumers should depend on this interface, not the concrete registry.
 */
export interface ISportRegistryReader {
  listSports(): readonly ISportConfig[];
  /** @throws {Error} if `id` is not a known sport. */
  getSport(id: string): ISportConfig;
  /** @throws {Error} if sport or event type is unknown. */
  getEventType(sportId: string, eventTypeId: string): ISportEventType;
}

/**
 * Translates a confirmed event + team selection into home/away score deltas.
 */
export interface IScoreDeltaCalculator {
  /**
   * @throws {Error} if event is `teamScoped` and `team` is null.
   */
  resolveScoreDelta(
    event: ISportEventType,
    team: TeamSide | null
  ): { homeDelta: number; awayDelta: number };
}

/**
 * Formats a 1-based period number into a human-readable string for a given sport.
 */
export interface IPeriodLabeler {
  formatPeriod(sportId: string, period: number, detail?: string | null): string;
}
