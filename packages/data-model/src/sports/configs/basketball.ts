import type { ISportConfig } from '../types';

export const basketballConfig: ISportConfig = {
  id: 'basketball',
  displayName: 'Basketball',
  clock: { mode: 'down', defaultPeriodSeconds: 480 },
  periods: {
    count: 4,
    overtimeLabel: 'OT',
    supportsPeriodDetail: false,
    labelFor(period: number): string {
      if (period >= 1 && period <= this.count) return `Q${period}`;
      return this.overtimeLabel;
    },
  },
  eventTypes: [
    // Scoring
    { id: 'field_goal',     label: 'Field Goal (2)',  icon: 'circle',        category: 'scoring', pointsDelta: 2, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    { id: 'three_pointer',  label: '3-Pointer',       icon: 'triangle',      category: 'scoring', pointsDelta: 3, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    { id: 'free_throw',     label: 'Free Throw',      icon: 'circle-dot',    category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'quarter_end',    label: 'End of Quarter', icon: 'timer-off',     category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    { id: 'overtime_start', label: 'Overtime',       icon: 'clock',         category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'dunk',   label: 'Dunk',  icon: 'arrow-down-circle', category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'block',  label: 'Block', icon: 'hand',               category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'steal',  label: 'Steal', icon: 'move',               category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
