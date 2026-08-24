import type { ISportConfig } from '../types';

export const soccerConfig: ISportConfig = {
  id: 'soccer',
  displayName: 'Soccer',
  clock: { mode: 'up', defaultPeriodSeconds: 2700 },
  periods: {
    count: 2,
    overtimeLabel: 'ET',
    supportsPeriodDetail: false,
    labelFor(period: number): string {
      if (period === 1) return '1st Half';
      if (period === 2) return '2nd Half';
      return this.overtimeLabel;
    },
  },
  eventTypes: [
    // Scoring
    {
      id: 'goal', label: 'Goal', icon: 'circle-dot', category: 'scoring',
      pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,
      requiresConfirmation: true, notifyWorthy: true, advancesPeriod: false,
      detailOptions: [
        { id: 'header',     label: 'Header' },
        { id: 'left_foot',  label: 'Left Foot' },
        { id: 'right_foot', label: 'Right Foot' },
        { id: 'volley',     label: 'Volley' },
        { id: 'free_kick',  label: 'Free Kick' },
        { id: 'counter',    label: 'Counter' },
      ],
    },
    { id: 'own_goal',      label: 'Own Goal',     icon: 'circle-alert', category: 'scoring', pointsDelta: 1, scoreAppliesTo: 'opponent',      teamScoped: true,  requiresConfirmation: true,  notifyWorthy: true,  advancesPeriod: false },
    {
      id: 'penalty_goal', label: 'Penalty Goal', icon: 'target', category: 'scoring',
      pointsDelta: 1, scoreAppliesTo: 'selected_team', teamScoped: true,
      requiresConfirmation: true, notifyWorthy: true, advancesPeriod: false,
      detailOptions: [
        { id: 'left_foot',  label: 'Left Foot' },
        { id: 'right_foot', label: 'Right Foot' },
        { id: 'panenka',    label: 'Panenka' },
      ],
    },
    // Period
    { id: 'half_end',          label: 'Half End',          icon: 'timer-off',    category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    { id: 'full_time',         label: 'Full Time',         icon: 'flag',         category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: false },
    { id: 'extra_time_start',  label: 'Extra Time',        icon: 'plus-circle',  category: 'period', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: false, requiresConfirmation: true,  notifyWorthy: false, advancesPeriod: true  },
    // Hype
    { id: 'big_save',     label: 'Big Save',    icon: 'shield',          category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'yellow_card',  label: 'Yellow Card', icon: 'square',          category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
    { id: 'red_card',     label: 'Red Card',    icon: 'square-x',        category: 'hype', pointsDelta: 0, scoreAppliesTo: 'none', teamScoped: true,  requiresConfirmation: false, notifyWorthy: false, advancesPeriod: false },
  ],
} as const;
