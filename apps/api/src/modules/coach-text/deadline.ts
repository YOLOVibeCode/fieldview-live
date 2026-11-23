/**
 * Coach text commands: the reply window.
 *
 * A text has `COACH_TEXT_REPLY_BUDGET_MS` from its arrival to its reply, which
 * leaves room for the relay inside its 15 seconds. A camera lookup is raced
 * against what is left, and no write starts once the time is up: a reply that
 * never reaches the coach must never go with a change they cannot see.
 */

export class Deadline {
  /** The moment the reply must be on its way, in milliseconds. */
  readonly atMs: number;

  constructor(
    startedAtMs: number,
    budgetMs: number,
    private readonly nowMs: () => number = (): number => Date.now()
  ) {
    this.atMs = startedAtMs + budgetMs;
  }

  remainingMs(): number {
    return Math.max(0, this.atMs - this.nowMs());
  }

  passed(): boolean {
    return this.nowMs() >= this.atMs;
  }
}

export type Raced<T> = { done: true; value: T } | { done: false };

/**
 * Waits for `work` at most `ms`. The work itself goes on; only the waiting stops,
 * so a slow lookup can still finish for the next text.
 */
export function raceWithin<T>(work: Promise<T>, ms: number): Promise<Raced<T>> {
  if (ms <= 0) {
    // Nobody waits for it, so its failure must not go unhandled.
    work.catch(() => undefined);
    return Promise.resolve({ done: false });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<Raced<T>>((resolve) => {
    timer = setTimeout(() => resolve({ done: false }), ms);
  });
  const done = work.then((value): Raced<T> => ({ done: true, value }));
  return Promise.race([done, late]).finally(() => clearTimeout(timer));
}
