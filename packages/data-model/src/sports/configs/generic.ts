import type { ISportConfig } from '../types';

export const genericConfig: ISportConfig = {
  id: 'generic',
  displayName: 'Generic',
  clock: { mode: 'up', defaultPeriodSeconds: 600 },
  periods: {
    count: 4,
    overtimeLabel: 'OT',
    supportsPeriodDetail: false,
    labelFor(period: number): string {
      if (period >= 1 && period <= this.count) return `P${period}`;
      return this.overtimeLabel;
    },
  },
  eventTypes: [
    // Scoring
    { id: 'score', label: 'Score', icon: 'trophy', category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'period_end', label: 'End of Period', icon: 'timer-off', category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'highlight', label: 'Highlight', icon: 'star', category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
