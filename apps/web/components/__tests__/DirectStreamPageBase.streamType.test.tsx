/**
 * DirectStreamPageBase passes bootstrap muxStreamType to StreamPlayer as streamType.
 */

import { render, waitFor, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const captured = vi.hoisted(() => ({ streamType: undefined as string | undefined }));

vi.mock('@/hooks/useGlobalViewerAuth', () => ({
  useGlobalViewerAuth: () => ({
    viewerIdentityId: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useViewerCount', () => ({ useViewerCount: () => ({ count: 0 }) }));
vi.mock('@/hooks/v2/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isDesktop: true,
    orientation: 'landscape',
    chatPosition: 'right',
    scoreboardPosition: 'left',
  }),
}));
vi.mock('@/hooks/v2/useFullscreen', () => ({ useFullscreen: () => ({ isFullscreen: false }) }));
vi.mock('@/hooks/v2/useDirectStreamPaywall', () => ({
  useDirectStreamPaywall: () => ({
    hasPaid: true,
    isBlocked: false,
    isLoading: false,
    showPaywall: false,
  }),
}));
vi.mock('@/hooks/v2/useDirectStreamViewer', () => ({
  useDirectStreamViewer: () => ({
    viewerId: 'v1',
    displayName: 'Viewer',
    isRegistered: true,
  }),
}));
vi.mock('@/hooks/useCollapsiblePanel', () => ({
  useCollapsiblePanel: () => ({ isOpen: false, open: vi.fn(), close: vi.fn() }),
}));

vi.mock('@/components/v2/video/StreamPlayer', () => ({
  StreamPlayer: (props: { streamType?: string; onStatusChange?: (s: string) => void }) => {
    captured.streamType = props.streamType;
    props.onStatusChange?.('playing');
    return <div data-testid="mock-stream-player" />;
  },
}));

import { DirectStreamPageBase } from '../DirectStreamPageBase';

describe('DirectStreamPageBase streamType wiring', () => {
  beforeEach(() => {
    captured.streamType = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('bootstrap')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                slug: 'test-stream',
                title: 'Test',
                streamUrl: 'https://stream.mux.com/abc.m3u8',
                streamProvider: 'mux_managed',
                muxPlaybackId: 'abc',
                muxStreamType: 'live:dvr',
                chatEnabled: false,
                paywallEnabled: false,
                scoreboardEnabled: false,
                gameId: 'g1',
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('passes bootstrap muxStreamType as streamType on StreamPlayer', async () => {
    render(
      <DirectStreamPageBase
        config={{
          slug: 'test-stream',
          title: 'Test',
          bootstrapUrl: 'http://localhost/api/direct/test-stream/bootstrap',
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('mock-stream-player')).toBeInTheDocument();
    });
    expect(captured.streamType).toBe('live:dvr');
  });
});
