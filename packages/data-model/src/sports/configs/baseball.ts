import type { ISportConfig } from '../types';

const ORDINALS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd',
};
function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

export const baseballConfig: ISportConfig = {
  id: 'baseball',
  displayName: 'Baseball / Softball',
  clock: { mode: 'none', defaultPeriodSeconds: null },
  periods: {
    count: 9,
    overtimeLabel: 'OT',
    supportsPeriodDetail: true,
    labelFor(period: number, detail?: string | null): string {
      if (period > this.count) return this.overtimeLabel;
      const half = detail === 'bottom' ? 'Bot' : 'Top';
      return `${half} ${ordinal(period)}`;
    },
  },
  eventTypes: [
    // Scoring
    { id: 'run', label: 'Run Scored', icon: 'circle-dot', category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'inning_end',   label: 'Inning End',   icon: 'timer-off', category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    { id: 'switch_half',  label: 'Switch Half',  icon: 'arrow-left-right', category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: false },
    // Hype
    { id: 'strikeout',    label: 'Strikeout',   icon: 'x-circle',   category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'great_catch',  label: 'Great Catch', icon: 'award',      category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'stolen_base',  label: 'Stolen Base', icon: 'move-right', category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
