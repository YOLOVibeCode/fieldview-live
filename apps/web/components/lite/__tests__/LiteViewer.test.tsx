/**
 * LiteViewer Tests
 *
 * Mocks all reused data/auth hooks (pattern mirrors
 * DirectStreamPageBase.integration.test.tsx) and asserts the overlay state
 * matrix: scoreboard / chat / viewer-count / paywall / status.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// --- Mocks ----------------------------------------------------------------
const mockApiRequest = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  ApiError: class ApiError extends Error {},
}));

const viewerState = {
  isUnlocked: true,
  token: 'vt',
  viewerId: 'viewer-1',
  isLoading: false,
  error: null,
  unlock: vi.fn(),
  setExternalIdentity: vi.fn(),
};
vi.mock('@/hooks/useViewerIdentity', () => ({
  useViewerIdentity: () => viewerState,
}));

const paywallState = {
  isBlocked: false,
  showPaywall: false,
  priceInCents: 500,
  customMessage: null as string | null,
  openPaywall: vi.fn(),
  closePaywall: vi.fn(),
  markAsPaid: vi.fn(),
};
vi.mock('@/hooks/usePaywall', () => ({
  usePaywall: () => paywallState,
}));

vi.mock('@/hooks/useScoreboardData', () => ({
  useScoreboardData: () => ({
    homeTeam: { name: 'Home', score: 2, color: '#111' },
    awayTeam: { name: 'Away', score: 1, color: '#222' },
    period: 'Q2',
    time: '10:00',
    isLoading: false,
    error: null,
    saveError: null,
    updateScore: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGameChatV2', () => ({
  useGameChatV2: () => ({
    messages: [
      {
        id: 'm1',
        userName: 'Sam',
        userId: 'u1',
        userColor: '#3B82F6',
        message: 'hello',
        timestamp: new Date('2026-01-01'),
        isSystem: false,
      },
    ],
    sendMessage: vi.fn(),
    isConnected: true,
    isLoading: false,
    error: null,
    currentUserId: 'viewer-1',
    latestBroadcast: null,
    setLatestBroadcast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useViewerCount', () => ({
  useViewerCount: () => ({ count: 42 }),
}));

vi.mock('@/hooks/useViewportFullscreen', () => ({
  useViewportFullscreen: () => ({
    isFullscreen: false,
    isFakeFullscreen: false,
    isNativeSupported: true,
    enter: vi.fn(),
    exit: vi.fn(),
    toggle: vi.fn(),
  }),
}));

// Avoid hls.js in the player; we only care about overlay wiring here.
vi.mock('../LiteVideoPlayer', () => ({
  LiteVideoPlayer: () => <div data-testid="lite-video" />,
}));

import { LiteViewer } from '../LiteViewer';

const BOOTSTRAP = {
  slug: 'litetest',
  gameId: 'game-1',
  streamUrl: 'https://cdn.example.com/live.m3u8',
  title: 'Lite Test',
  chatEnabled: true,
  scoreboardEnabled: true,
  paywallEnabled: false,
  allowAnonymousChat: false,
  streamProvider: 'byo_hls',
  muxPlaybackId: null,
};

function renderViewer() {
  return render(
    <LiteViewer config={{ bootstrapUrl: '/api/direct/litetest/bootstrap', title: 'Lite Test' }} />
  );
}

describe('LiteViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paywallState.isBlocked = false;
    mockApiRequest.mockResolvedValue(BOOTSTRAP);
  });

  it('renders the wrapper + overlay layer + video', async () => {
    renderViewer();
    await waitFor(() => {
      expect(screen.getByTestId('lite-viewer-container')).toBeInTheDocument();
    });
    expect(screen.getByTestId('lite-overlay-layer')).toBeInTheDocument();
    expect(screen.getByTestId('lite-video')).toBeInTheDocument();
  });

  it('shows scoreboard, chat, and viewer count when enabled', async () => {
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('lite-scoreboard')).toBeInTheDocument());
    expect(screen.getByTestId('lite-score-home')).toHaveTextContent('2');
    expect(screen.getByTestId('lite-score-away')).toHaveTextContent('1');
    expect(screen.getByTestId('lite-chat')).toBeInTheDocument();
    expect(screen.getByTestId('lite-viewer-count')).toHaveTextContent('42');
  });

  it('blocks content and hides overlays when paywalled', async () => {
    paywallState.isBlocked = true;
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('lite-paywall')).toBeInTheDocument());
    expect(screen.queryByTestId('lite-scoreboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lite-chat')).not.toBeInTheDocument();
  });

  it('surfaces an error if bootstrap fails', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('boom'));
    renderViewer();
    await waitFor(() =>
      expect(screen.getByTestId('lite-bootstrap-error')).toBeInTheDocument()
    );
  });
});
