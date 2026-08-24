import type { ISportConfig } from '../types';

export const volleyballConfig: ISportConfig = {
  id: 'volleyball',
  displayName: 'Volleyball',
  clock: { mode: 'none', defaultPeriodSeconds: null },
  periods: {
    count: 5,
    overtimeLabel: 'OT',
    supportsPeriodDetail: false,
    labelFor(period: number): string {
      if (period >= 1 && period <= this.count) return `Set ${period}`;
      return this.overtimeLabel;
    },
  },
  eventTypes: [
    // Scoring
    { id: 'point', label: 'Point', icon: 'circle-dot', category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'set_end', label: 'Set End', icon: 'timer-off', category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'ace',    label: 'Ace',   icon: 'zap',    category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'block',  label: 'Block', icon: 'hand',   category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'dig',    label: 'Dig',   icon: 'arrow-down', category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
