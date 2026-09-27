import { describe, it, expect } from 'vitest';
import { resolveMuxStreamType } from '../mux-stream-type';

describe('resolveMuxStreamType', () => {
  it('returns undefined for non-mux providers', () => {
    expect(resolveMuxStreamType('byo_hls', 'live')).toBeUndefined();
    expect(resolveMuxStreamType('unknown', 'active')).toBeUndefined();
  });

  it('returns live:dvr for mux_managed unless game ended or cancelled', () => {
    expect(resolveMuxStreamType('mux_managed', 'active')).toBe('live:dvr');
    expect(resolveMuxStreamType('mux_managed', 'draft')).toBe('live:dvr');
    expect(resolveMuxStreamType('mux_managed', 'live')).toBe('live:dvr');
    expect(resolveMuxStreamType('mux_managed', null)).toBe('live:dvr');
    expect(resolveMuxStreamType('mux_managed', undefined)).toBe('live:dvr');
  });

  it('returns on-demand for mux_managed when game is ended or cancelled', () => {
    expect(resolveMuxStreamType('mux_managed', 'ended')).toBe('on-demand');
    expect(resolveMuxStreamType('mux_managed', 'cancelled')).toBe('on-demand');
  });
});
