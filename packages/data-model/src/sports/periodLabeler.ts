/**
 * Period Labeler
 *
 * Formats a 1-based period number into a human-readable string for any sport.
 * Implements IPeriodLabeler.
 */

import type { IPeriodLabeler, ISportRegistryReader } from './types';

export class PeriodLabeler implements IPeriodLabeler {
  constructor(private readonly registry: ISportRegistryReader) {}

  formatPeriod(sportId: string, period: number, detail?: string | null): string {
    const sport = this.registry.getSport(sportId);
    return sport.periods.labelFor(period, detail);
  }
}
