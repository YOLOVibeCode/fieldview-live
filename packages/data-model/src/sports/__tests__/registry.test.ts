import { describe, it, expect } from 'vitest';
import { sportRegistry } from '../registry';

const EXPECTED_SPORT_IDS = [
  'soccer',
  'football',
  'basketball',
  'lacrosse',
  'baseball',
  'volleyball',
  'hockey',
  'generic',
] as const;

describe('sportRegistry.listSports()', () => {
  it('returns exactly the eight expected sport ids', () => {
    const ids = sportRegistry.listSports().map((s) => s.id);
    expect(ids.sort()).toEqual([...EXPECTED_SPORT_IDS].sort());
  });
});

describe('sportRegistry.getSport()', () => {
  it('returns the config for a known sport', () => {
    const sport = sportRegistry.getSport('football');
    expect(sport.id).toBe('football');
  });

  it('throws for an unknown sport id', () => {
    expect(() => sportRegistry.getSport('bowling')).toThrow();
  });
});

describe('sportRegistry.getEventType()', () => {
  it('throws for an unknown sport', () => {
    expect(() => sportRegistry.getEventType('bowling', 'strike')).toThrow();
  });

  it('throws for an unknown event type on a known sport', () => {
    expect(() => sportRegistry.getEventType('football', 'buzzer_beater')).toThrow();
  });

  it('returns the correct event type', () => {
    const et = sportRegistry.getEventType('football', 'touchdown');
    expect(et.id).toBe('touchdown');
    expect(et.pointsDelta).toBe(6);
  });
});

describe('every sport has at least one event of each category', () => {
  for (const sport of sportRegistry.listSports()) {
    it(`${sport.id} has ≥1 scoring event`, () => {
      const scoring = sport.eventTypes.filter((e) => e.category === 'scoring');
      expect(scoring.length).toBeGreaterThanOrEqual(1);
    });

    it(`${sport.id} has ≥1 period event`, () => {
      const period = sport.eventTypes.filter((e) => e.category === 'period');
      expect(period.length).toBeGreaterThanOrEqual(1);
    });

    it(`${sport.id} has ≥1 hype event`, () => {
      const hype = sport.eventTypes.filter((e) => e.category === 'hype');
      expect(hype.length).toBeGreaterThanOrEqual(1);
    });
  }
});

describe('scoring event invariants', () => {
  for (const sport of sportRegistry.listSports()) {
    for (const et of sport.eventTypes.filter((e) => e.category === 'scoring')) {
      it(`${sport.id}/${et.id}: pointsDelta > 0`, () => {
        expect(et.pointsDelta).toBeGreaterThan(0);
      });

      it(`${sport.id}/${et.id}: requiresConfirmation === true`, () => {
        expect(et.requiresConfirmation).toBe(true);
      });

      it(`${sport.id}/${et.id}: notifyWorthy === true`, () => {
        expect(et.notifyWorthy).toBe(true);
      });

      it(`${sport.id}/${et.id}: teamScoped === true`, () => {
        expect(et.teamScoped).toBe(true);
      });
    }
  }
});

describe('period event invariants', () => {
  for (const sport of sportRegistry.listSports()) {
    for (const et of sport.eventTypes.filter((e) => e.category === 'period')) {
      it(`${sport.id}/${et.id}: pointsDelta === 0`, () => {
        expect(et.pointsDelta).toBe(0);
      });

      it(`${sport.id}/${et.id}: scoreAppliesTo === 'none'`, () => {
        expect(et.scoreAppliesTo).toBe('none');
      });

      it(`${sport.id}/${et.id}: requiresConfirmation === true`, () => {
        expect(et.requiresConfirmation).toBe(true);
      });
    }
  }
});

describe('hype event invariants', () => {
  for (const sport of sportRegistry.listSports()) {
    for (const et of sport.eventTypes.filter((e) => e.category === 'hype')) {
      it(`${sport.id}/${et.id}: pointsDelta === 0`, () => {
        expect(et.pointsDelta).toBe(0);
      });

      it(`${sport.id}/${et.id}: requiresConfirmation === false`, () => {
        expect(et.requiresConfirmation).toBe(false);
      });

      it(`${sport.id}/${et.id}: notifyWorthy === false`, () => {
        expect(et.notifyWorthy).toBe(false);
      });
    }
  }
});

describe('specific event values', () => {
  it('football touchdown: pointsDelta === 6', () => {
    expect(sportRegistry.getEventType('football', 'touchdown').pointsDelta).toBe(6);
  });

  it('football field_goal: pointsDelta === 3', () => {
    expect(sportRegistry.getEventType('football', 'field_goal').pointsDelta).toBe(3);
  });

  it('football extra_point: pointsDelta === 1', () => {
    expect(sportRegistry.getEventType('football', 'extra_point').pointsDelta).toBe(1);
  });

  it('football two_point: pointsDelta === 2', () => {
    expect(sportRegistry.getEventType('football', 'two_point').pointsDelta).toBe(2);
  });

  it('football safety: pointsDelta === 2', () => {
    expect(sportRegistry.getEventType('football', 'safety').pointsDelta).toBe(2);
  });

  it('basketball three_pointer: pointsDelta === 3', () => {
    expect(sportRegistry.getEventType('basketball', 'three_pointer').pointsDelta).toBe(3);
  });

  it('soccer own_goal: scoreAppliesTo === opponent', () => {
    expect(sportRegistry.getEventType('soccer', 'own_goal').scoreAppliesTo).toBe('opponent');
  });

  it('soccer penalty_goal: scoreAppliesTo === selected_team', () => {
    expect(sportRegistry.getEventType('soccer', 'penalty_goal').scoreAppliesTo).toBe('selected_team');
  });
});

describe('event id uniqueness within each sport', () => {
  for (const sport of sportRegistry.listSports()) {
    it(`${sport.id}: no duplicate event ids`, () => {
      const ids = sport.eventTypes.map((e) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  }
});

describe('detailOptions', () => {
  it('football/touchdown has detailOptions with yards units', () => {
    const td = sportRegistry.getEventType('football', 'touchdown');
    expect(td.detailOptions).toBeDefined();
    expect(td.detailOptions!.length).toBeGreaterThan(0);
    expect(td.detailOptions!.every((d) => d.unit === 'yards')).toBe(true);
  });

  it('football/field_goal has a distance detail option with yards unit', () => {
    const fg = sportRegistry.getEventType('football', 'field_goal');
    expect(fg.detailOptions).toBeDefined();
    const distance = fg.detailOptions!.find((d) => d.id === 'distance');
    expect(distance).toBeDefined();
    expect(distance!.unit).toBe('yards');
  });

  it('soccer/goal has detailOptions without units', () => {
    const goal = sportRegistry.getEventType('soccer', 'goal');
    expect(goal.detailOptions).toBeDefined();
    expect(goal.detailOptions!.find((d) => d.id === 'header')).toBeDefined();
    expect(goal.detailOptions!.every((d) => !d.unit)).toBe(true);
  });

  it('soccer/penalty_goal has detailOptions', () => {
    const pg = sportRegistry.getEventType('soccer', 'penalty_goal');
    expect(pg.detailOptions).toBeDefined();
    expect(pg.detailOptions!.length).toBeGreaterThan(0);
  });

  it('events without detailOptions have undefined or empty array', () => {
    const safety = sportRegistry.getEventType('football', 'safety');
    expect(!safety.detailOptions || safety.detailOptions.length === 0).toBe(true);
  });
});

describe('sport clock / period shape', () => {
  it('soccer uses count-up clock', () => {
    expect(sportRegistry.getSport('soccer').clock.mode).toBe('up');
  });

  it('football uses count-down clock', () => {
    expect(sportRegistry.getSport('football').clock.mode).toBe('down');
  });

  it('baseball has no clock', () => {
    expect(sportRegistry.getSport('baseball').clock.mode).toBe('none');
    expect(sportRegistry.getSport('baseball').clock.defaultPeriodSeconds).toBeNull();
  });

  it('volleyball has no clock', () => {
    expect(sportRegistry.getSport('volleyball').clock.mode).toBe('none');
  });

  it('baseball supports period detail (top/bottom)', () => {
    expect(sportRegistry.getSport('baseball').periods.supportsPeriodDetail).toBe(true);
  });

  it('soccer does not support period detail', () => {
    expect(sportRegistry.getSport('soccer').periods.supportsPeriodDetail).toBe(false);
  });
});
