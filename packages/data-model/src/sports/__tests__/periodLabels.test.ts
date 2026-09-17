import { describe, it, expect } from 'vitest';

import { PeriodLabeler } from '../periodLabeler';
import { sportRegistry } from '../registry';

const labeler = new PeriodLabeler(sportRegistry);

describe('PeriodLabeler.formatPeriod()', () => {
  // Soccer
  it('soccer period 1 → "1st Half"', () => {
    expect(labeler.formatPeriod('soccer', 1)).toBe('1st Half');
  });

  it('soccer period 2 → "2nd Half"', () => {
    expect(labeler.formatPeriod('soccer', 2)).toBe('2nd Half');
  });

  it('soccer period 3 (overtime) → "ET"', () => {
    expect(labeler.formatPeriod('soccer', 3)).toBe('ET');
  });

  // Football
  it('football period 1 → "Q1"', () => {
    expect(labeler.formatPeriod('football', 1)).toBe('Q1');
  });

  it('football period 3 → "Q3"', () => {
    expect(labeler.formatPeriod('football', 3)).toBe('Q3');
  });

  it('football period 4 → "Q4"', () => {
    expect(labeler.formatPeriod('football', 4)).toBe('Q4');
  });

  it('football period 5 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('football', 5)).toBe('OT');
  });

  // Basketball
  it('basketball period 1 → "Q1"', () => {
    expect(labeler.formatPeriod('basketball', 1)).toBe('Q1');
  });

  it('basketball period 5 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('basketball', 5)).toBe('OT');
  });

  // Lacrosse
  it('lacrosse period 2 → "Q2"', () => {
    expect(labeler.formatPeriod('lacrosse', 2)).toBe('Q2');
  });

  it('lacrosse period 5 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('lacrosse', 5)).toBe('OT');
  });

  // Hockey
  it('hockey period 2 → "P2"', () => {
    expect(labeler.formatPeriod('hockey', 2)).toBe('P2');
  });

  it('hockey period 4 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('hockey', 4)).toBe('OT');
  });

  // Volleyball
  it('volleyball set 1 → "Set 1"', () => {
    expect(labeler.formatPeriod('volleyball', 1)).toBe('Set 1');
  });

  it('volleyball set 2 → "Set 2"', () => {
    expect(labeler.formatPeriod('volleyball', 2)).toBe('Set 2');
  });

  it('volleyball period 6 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('volleyball', 6)).toBe('OT');
  });

  // Generic
  it('generic period 1 → "P1"', () => {
    expect(labeler.formatPeriod('generic', 1)).toBe('P1');
  });

  it('generic period 4 → "P4"', () => {
    expect(labeler.formatPeriod('generic', 4)).toBe('P4');
  });

  it('generic period 5 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('generic', 5)).toBe('OT');
  });

  // Baseball (detail)
  it('baseball period 5 top → "Top 5th"', () => {
    expect(labeler.formatPeriod('baseball', 5, 'top')).toBe('Top 5th');
  });

  it('baseball period 5 bottom → "Bot 5th"', () => {
    expect(labeler.formatPeriod('baseball', 5, 'bottom')).toBe('Bot 5th');
  });

  it('baseball period 1 top → "Top 1st"', () => {
    expect(labeler.formatPeriod('baseball', 1, 'top')).toBe('Top 1st');
  });

  it('baseball period 3 bottom → "Bot 3rd"', () => {
    expect(labeler.formatPeriod('baseball', 3, 'bottom')).toBe('Bot 3rd');
  });

  it('baseball period 2 top → "Top 2nd"', () => {
    expect(labeler.formatPeriod('baseball', 2, 'top')).toBe('Top 2nd');
  });

  it('baseball period 10 (overtime) → "OT"', () => {
    expect(labeler.formatPeriod('baseball', 10)).toBe('OT');
  });

  it('baseball defaults to top when no detail provided', () => {
    expect(labeler.formatPeriod('baseball', 3)).toBe('Top 3rd');
  });

  // Clock modes
  it('baseball clock.mode === none', () => {
    expect(sportRegistry.getSport('baseball').clock.mode).toBe('none');
  });

  it('soccer clock.mode === up', () => {
    expect(sportRegistry.getSport('soccer').clock.mode).toBe('up');
  });

  it('football clock.mode === down', () => {
    expect(sportRegistry.getSport('football').clock.mode).toBe('down');
  });

  it('hockey clock.mode === down', () => {
    expect(sportRegistry.getSport('hockey').clock.mode).toBe('down');
  });
});
