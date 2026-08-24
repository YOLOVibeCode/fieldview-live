import { describe, it, expect } from 'vitest';
import { ReportGameEventSchema } from '../../schemas/gameEvent';

describe('ReportGameEventSchema', () => {
  describe('valid inputs', () => {
    it('accepts a valid teamScoped scoring event', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'football',
        eventTypeId: 'touchdown',
        team: 'home',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a valid teamScoped hype event', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'football',
        eventTypeId: 'big_play',
        team: 'away',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a period event with no team', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'football',
        eventTypeId: 'quarter_end',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a non-teamScoped hype event with no team', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'hockey',
        eventTypeId: 'fight',
      });
      expect(result.success).toBe(true);
    });

    it('accepts soccer own_goal with a team', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'soccer',
        eventTypeId: 'own_goal',
        team: 'home',
      });
      expect(result.success).toBe(true);
    });

    it('accepts baseball run with team', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'baseball',
        eventTypeId: 'run',
        team: 'away',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional clockSeconds', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'soccer',
        eventTypeId: 'goal',
        team: 'home',
        clockSeconds: 1234,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs — sport / event type', () => {
    it('rejects an unknown sportId', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'bowling',
        eventTypeId: 'strike',
        team: 'home',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an eventTypeId not belonging to the given sport', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'soccer',
        eventTypeId: 'touchdown', // football event
        team: 'home',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty sportId', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: '',
        eventTypeId: 'touchdown',
        team: 'home',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid inputs — team field', () => {
    it('rejects missing team when event is teamScoped', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'football',
        eventTypeId: 'touchdown',
        // team deliberately omitted
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing team for teamScoped scoring event (basketball)', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'basketball',
        eventTypeId: 'three_pointer',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid team value', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'football',
        eventTypeId: 'touchdown',
        team: 'visitors', // not 'home' | 'away'
      });
      expect(result.success).toBe(false);
    });

    it('accepts undefined team for non-teamScoped hockey fight', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'hockey',
        eventTypeId: 'fight',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('clockSeconds must be a non-negative integer when provided', () => {
      const negative = ReportGameEventSchema.safeParse({
        sportId: 'soccer',
        eventTypeId: 'goal',
        team: 'home',
        clockSeconds: -5,
      });
      expect(negative.success).toBe(false);
    });

    it('accepts clockSeconds === 0', () => {
      const result = ReportGameEventSchema.safeParse({
        sportId: 'soccer',
        eventTypeId: 'goal',
        team: 'home',
        clockSeconds: 0,
      });
      expect(result.success).toBe(true);
    });
  });
});
