/**
 * LiteVideoPlayer Tests
 *
 * Source resolution (Mux / BYO HLS / embed / none) is pure and fully tested.
 * Render branches verify embed vs <video>.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resolveLiteSource, LiteVideoPlayer } from '../LiteVideoPlayer';

// hls.js is heavy and DOM-bound; stub it. Default to "not supported" so the
// effect takes the native-HLS path (no real network in jsdom).
vi.mock('hls.js', () => {
  const Hls = vi.fn();
  // @ts-expect-error static helpers on the mock
  Hls.isSupported = () => false;
  // @ts-expect-error static events
  Hls.Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' };
  return { default: Hls };
});

describe('resolveLiteSource', () => {
  it('builds Mux HLS URL from playback id', () => {
    expect(resolveLiteSource(null, 'mux_managed', 'abc123')).toEqual({
      kind: 'hls',
      url: 'https://stream.mux.com/abc123.m3u8',
    });
  });

  it('falls back to streamUrl for mux when no playback id', () => {
    expect(
      resolveLiteSource('https://stream.mux.com/xyz.m3u8', 'mux_managed', null)
    ).toEqual({ kind: 'hls', url: 'https://stream.mux.com/xyz.m3u8' });
  });

  it('passes through BYO HLS url', () => {
    expect(
      resolveLiteSource('https://cdn.example.com/live.m3u8', 'byo_hls', null)
    ).toEqual({ kind: 'hls', url: 'https://cdn.example.com/live.m3u8' });
  });

  it('returns embed for external_embed', () => {
    expect(
      resolveLiteSource('https://youtube.com/watch?v=1', 'external_embed', null)
    ).toEqual({ kind: 'embed', url: 'https://youtube.com/watch?v=1' });
  });

  it('detects .m3u8 even when provider is unknown', () => {
    expect(resolveLiteSource('https://x.tld/a.m3u8', 'unknown', null)).toEqual({
      kind: 'hls',
      url: 'https://x.tld/a.m3u8',
    });
  });

  it('returns none for rtmp / missing url', () => {
    expect(resolveLiteSource('rtmp://x/live', 'byo_rtmp', null)).toEqual({ kind: 'none' });
    expect(resolveLiteSource(null, null, null)).toEqual({ kind: 'none' });
  });
});

describe('LiteVideoPlayer render', () => {
  it('renders an iframe for embeds', () => {
    render(
      <LiteVideoPlayer
        streamUrl="https://youtube.com/embed/1"
        streamProvider="external_embed"
      />
    );
    expect(screen.getByTestId('lite-video-embed')).toBeInTheDocument();
  });

  it('renders a <video> for HLS sources', () => {
    render(
      <LiteVideoPlayer
        streamUrl="https://cdn.example.com/live.m3u8"
        streamProvider="byo_hls"
      />
    );
    expect(screen.getByTestId('lite-video')).toBeInTheDocument();
  });

  it('reports offline when no playable source', () => {
    const onStatusChange = vi.fn();
    render(
      <LiteVideoPlayer
        streamUrl={null}
        streamProvider={null}
        onStatusChange={onStatusChange}
      />
    );
    expect(onStatusChange).toHaveBeenCalledWith('offline');
  });
});
