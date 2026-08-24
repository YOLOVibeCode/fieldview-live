import type { ISportConfig } from '../types';

export const footballConfig: ISportConfig = {
  id: 'football',
  displayName: 'American Football',
  clock: { mode: 'down', defaultPeriodSeconds: 720 },
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
    {
      id: 'touchdown', label: 'Touchdown', icon: 'zap', category: 'scoring',
      pointsDelta: 6, scoreAppliesTo: 'selected_team', teamScoped: true,
      requiresConfirmation: true, notifyWorthy: true, advancesPeriod: false,
      detailOptions: [
        { id: 'run',               label: 'Run',               unit: 'yards' },
        { id: 'pass',              label: 'Pass',              unit: 'yards' },
        { id: 'kick_return',       label: 'Kick Return',       unit: 'yards' },
        { id: 'punt_return',       label: 'Punt Return',       unit: 'yards' },
        { id: 'interception_return', label: 'Interception Return', unit: 'yards' },
      ],
    },
    { id: 'extra_point', label: 'Extra Point',   icon: 'plus',        category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    { id: 'two_point',   label: '2-Point Conv.', icon: 'plus-square', category: 'scoring', pointsDelta: 2, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    {
      id: 'field_goal', label: 'Field Goal', icon: 'trophy', category: 'scoring',
      pointsDelta: 3, scoreAppliesTo: 'selected_team', teamScoped: true,
      requiresConfirmation: true, notifyWorthy: true, advancesPeriod: false,
      detailOptions: [
        { id: 'distance', label: 'Distance', unit: 'yards' },
      ],
    },
    // Safety: reporter picks the team that *receives* the 2 points
    { id: 'safety',      label: 'Safety',          icon: 'shield-alert',  category: 'scoring', pointsDelta: 2, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'quarter_end',    label: 'End of Quarter', icon: 'timer-off',    category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    { id: 'overtime_start', label: 'Overtime',       icon: 'clock',        category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'big_play',      label: 'Big Play',     icon: 'flame',          category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'interception',  label: 'Interception', icon: 'arrow-left-right', category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'fumble',        label: 'Fumble',       icon: 'circle-off',     category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
