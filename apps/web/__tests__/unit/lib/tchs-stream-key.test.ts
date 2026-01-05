import { describe, it, expect } from 'vitest';
import { buildTchsStreamKey } from '@/lib/tchs-stream-key';

describe('buildTchsStreamKey', () => {
  it('builds a stable key', () => {
    expect(buildTchsStreamKey({ date: '20260106', team: 'SoccerJV' })).toBe('tchs-20260106-soccerjv');
  });

  it('slugifies team names', () => {
    expect(buildTchsStreamKey({ date: '20260106', team: 'Soccer Varsity' })).toBe('tchs-20260106-soccer-varsity');
  });

  it('throws on invalid date', () => {
    expect(() => buildTchsStreamKey({ date: '2026-01-06', team: 'SoccerJV' })).toThrow();
  });
});


