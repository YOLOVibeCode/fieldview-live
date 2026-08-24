import { describe, it, expect } from 'vitest';
import { sportRegistry } from '../registry';
import { buildNarration } from '../narration';

describe('buildNarration', () => {
  describe('football touchdown', () => {
    const td = sportRegistry.getEventType('football', 'touchdown');

    it('full detail: team, jersey, yards, run', () => {
      expect(
        buildNarration(td, { team: 'home', teamName: 'Eagles', jerseyNumber: 12, detail: 'run', detailValue: 18 })
      ).toBe('Touchdown — Eagles, #12 — 18-yd run');
    });

    it('full detail: pass with yards', () => {
      expect(
        buildNarration(td, { team: 'away', teamName: 'Hawks', jerseyNumber: 7, detail: 'pass', detailValue: 35 })
      ).toBe('Touchdown — Hawks, #7 — 35-yd pass');
    });

    it('no detail: falls back to label + team', () => {
      expect(
        buildNarration(td, { team: 'home', teamName: 'Eagles' })
      ).toBe('Touchdown — Eagles');
    });

    it('no detail, no team: just the label', () => {
      expect(buildNarration(td, { team: null })).toBe('Touchdown');
    });

    it('jersey only (no team name or detail)', () => {
      expect(
        buildNarration(td, { team: 'home', jerseyNumber: 88 })
      ).toBe('Touchdown — #88');
    });
  });

  describe('football field_goal', () => {
    const fg = sportRegistry.getEventType('football', 'field_goal');

    it('distance chip with yards', () => {
      expect(
        buildNarration(fg, { team: 'home', teamName: 'Eagles', detail: 'distance', detailValue: 42 })
      ).toBe('Field Goal — Eagles — 42-yd distance');
    });

    it('no chip but value provided (single-option shortcut)', () => {
      expect(
        buildNarration(fg, { team: 'home', teamName: 'Eagles', detailValue: 42 })
      ).toBe('Field Goal — Eagles — 42-yd');
    });
  });

  describe('soccer goal', () => {
    const goal = sportRegistry.getEventType('soccer', 'goal');

    it('full detail: team, jersey, header', () => {
      expect(
        buildNarration(goal, { team: 'home', teamName: 'Hawks', jerseyNumber: 9, detail: 'header' })
      ).toBe('Goal — Hawks, #9 — header');
    });

    it('left foot detail', () => {
      expect(
        buildNarration(goal, { team: 'away', teamName: 'Eagles', detail: 'left_foot' })
      ).toBe('Goal — Eagles — left foot');
    });

    it('no detail fallback', () => {
      expect(
        buildNarration(goal, { team: 'home', teamName: 'Hawks' })
      ).toBe('Goal — Hawks');
    });
  });

  describe('soccer penalty_goal', () => {
    const pg = sportRegistry.getEventType('soccer', 'penalty_goal');

    it('panenka chip', () => {
      expect(
        buildNarration(pg, { team: 'away', teamName: 'Eagles', jerseyNumber: 10, detail: 'panenka' })
      ).toBe('Penalty Goal — Eagles, #10 — panenka');
    });
  });

  describe('neutral period event', () => {
    const qe = sportRegistry.getEventType('football', 'quarter_end');

    it('no team info — just the label', () => {
      expect(buildNarration(qe, { team: null })).toBe('End of Quarter');
    });
  });

  describe('unknown detail id is ignored', () => {
    const td = sportRegistry.getEventType('football', 'touchdown');

    it('unknown detailId gracefully omitted', () => {
      expect(
        buildNarration(td, { team: 'home', teamName: 'Eagles', detail: 'unknown_type' })
      ).toBe('Touchdown — Eagles');
    });
  });
});
