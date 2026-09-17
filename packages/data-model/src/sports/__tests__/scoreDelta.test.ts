import { describe, it, expect } from 'vitest';

import { sportRegistry } from '../registry';
import { ScoreDeltaCalculator } from '../scoreDelta';

const calc = new ScoreDeltaCalculator();

describe('ScoreDeltaCalculator.resolveScoreDelta()', () => {
  it('football touchdown + home → {6, 0}', () => {
    const et = sportRegistry.getEventType('football', 'touchdown');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 6, awayDelta: 0 });
  });

  it('football touchdown + away → {0, 6}', () => {
    const et = sportRegistry.getEventType('football', 'touchdown');
    expect(calc.resolveScoreDelta(et, 'away')).toEqual({ homeDelta: 0, awayDelta: 6 });
  });

  it('football field_goal + home → {3, 0}', () => {
    const et = sportRegistry.getEventType('football', 'field_goal');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 3, awayDelta: 0 });
  });

  it('soccer own_goal + home → {0, 1} (opponent gets the point)', () => {
    const et = sportRegistry.getEventType('soccer', 'own_goal');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 0, awayDelta: 1 });
  });

  it('soccer own_goal + away → {1, 0}', () => {
    const et = sportRegistry.getEventType('soccer', 'own_goal');
    expect(calc.resolveScoreDelta(et, 'away')).toEqual({ homeDelta: 1, awayDelta: 0 });
  });

  it('basketball three_pointer + away → {0, 3}', () => {
    const et = sportRegistry.getEventType('basketball', 'three_pointer');
    expect(calc.resolveScoreDelta(et, 'away')).toEqual({ homeDelta: 0, awayDelta: 3 });
  });

  it('hockey great_save (hype) → {0, 0} regardless of team', () => {
    const et = sportRegistry.getEventType('hockey', 'great_save');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 0, awayDelta: 0 });
  });

  it('soccer half_end (period, no score) → {0, 0}', () => {
    const et = sportRegistry.getEventType('soccer', 'half_end');
    expect(calc.resolveScoreDelta(et, null)).toEqual({ homeDelta: 0, awayDelta: 0 });
  });

  it('throws when teamScoped event receives team: null', () => {
    const et = sportRegistry.getEventType('football', 'touchdown');
    expect(() => calc.resolveScoreDelta(et, null)).toThrow();
  });

  it('football safety + home → {2, 0} (team that receives safety gets points)', () => {
    const et = sportRegistry.getEventType('football', 'safety');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 2, awayDelta: 0 });
  });

  it('baseball run + away → {0, 1}', () => {
    const et = sportRegistry.getEventType('baseball', 'run');
    expect(calc.resolveScoreDelta(et, 'away')).toEqual({ homeDelta: 0, awayDelta: 1 });
  });

  it('volleyball point + home → {1, 0}', () => {
    const et = sportRegistry.getEventType('volleyball', 'point');
    expect(calc.resolveScoreDelta(et, 'home')).toEqual({ homeDelta: 1, awayDelta: 0 });
  });

  it('generic score + away → {0, 1}', () => {
    const et = sportRegistry.getEventType('generic', 'score');
    expect(calc.resolveScoreDelta(et, 'away')).toEqual({ homeDelta: 0, awayDelta: 1 });
  });
});
