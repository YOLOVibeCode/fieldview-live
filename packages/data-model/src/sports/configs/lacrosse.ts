import type { ISportConfig } from '../types';

export const lacrosseConfig: ISportConfig = {
  id: 'lacrosse',
  displayName: 'Lacrosse',
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
    { id: 'goal', label: 'Goal', icon: 'circle-dot', category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    // Period
    { id: 'quarter_end',    label: 'End of Quarter', icon: 'timer-off', category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    { id: 'overtime_start', label: 'Overtime',       icon: 'clock',     category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'save',         label: 'Big Save',     icon: 'shield',    category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'faceoff_win',  label: 'Faceoff Win',  icon: 'swords',    category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
