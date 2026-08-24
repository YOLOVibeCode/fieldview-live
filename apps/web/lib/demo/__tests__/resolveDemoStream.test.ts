import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_DEMO_STREAM,
  parseDemoStreamInput,
  loadDemoPlayback,
} from '../resolveDemoStream';

describe('parseDemoStreamInput', () => {
  it('empty input uses the default Mux stream', () => {
    expect(parseDemoStreamInput('')).toEqual({ kind: 'url', url: DEFAULT_DEMO_STREAM });
    expect(parseDemoStreamInput('   ')).toEqual({ kind: 'url', url: DEFAULT_DEMO_STREAM });
  });

  it('keeps an HLS URL as-is', () => {
    const url = 'https://stream.mux.com/abc.m3u8';
    expect(parseDemoStreamInput(url)).toEqual({ kind: 'url', url });
  });

  it('treats a FieldView slug as a slug', () => {
    expect(parseDemoStreamInput('tchs')).toEqual({ kind: 'slug', slug: 'tchs' });
    expect(parseDemoStreamInput('/direct/tchs')).toEqual({ kind: 'slug', slug: 'tchs' });
  });

  it('extracts a slug from a FieldView watch URL', () => {
    expect(parseDemoStreamInput('https://fieldview.live/direct/tchs')).toEqual({
      kind: 'slug',
      slug: 'tchs',
    });
  });
});

describe('loadDemoPlayback', () => {
  it('returns the URL without fetching', async () => {
    const fetchFn = vi.fn();
    const result = await loadDemoPlayback('https://stream.mux.com/x.m3u8', fetchFn);
    expect(result.src).toBe('https://stream.mux.com/x.m3u8');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('resolves a slug via bootstrap', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        streamUrl: 'https://stream.mux.com/live.m3u8',
        page: { sport: 'football' },
        title: 'TCHS',
      }),
    });
    const result = await loadDemoPlayback('tchs', fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('http://localhost:4301/api/direct/tchs/bootstrap');
    expect(result).toEqual({
      src: 'https://stream.mux.com/live.m3u8',
      sportId: 'football',
      title: 'TCHS',
    });
  });

  it('builds HLS from a top-level muxPlaybackId', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ muxPlaybackId: 'abc123', sport: 'soccer' }),
    });
    const result = await loadDemoPlayback('tchs', fetchFn);
    expect(result.src).toBe('https://stream.mux.com/abc123.m3u8');
    expect(result.sportId).toBe('soccer');
  });
});
