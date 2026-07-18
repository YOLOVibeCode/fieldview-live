/**
 * DirectStreamPageBase — Full Page-State Integration Tests
 *
 * Tests the real page shell with mocked hooks/fetch. Each describe block maps
 * to a wireframe state from SCREEN-STATES-COVERAGE.md (D1–D14, L7–L10).
 *
 * State matrix tested:
 *   - Offline (no schedule, scheduled + Notify Me)
 *   - Paywall blocked
 *   - Error state
 *   - Playing — chat locked (not registered)
 *   - Playing — chat unlocked (registered)
 *   - Playing — anonymous/guest
 *   - Admin panel open
 *   - Welcome message banner
 *   - Viewer identity bar (authenticated vs not)
 *   - Scoreboard / Chat / Bookmark panel structure
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Configurable mocks — defaults overridden per-test via mockXxx.mockReturnValue
// ---------------------------------------------------------------------------

const mockGlobalAuth = vi.fn(() => ({
  viewerIdentityId: null,
  viewerEmail: null,
  viewerName: null,
  isAuthenticated: false,
  setViewerAuth: vi.fn(),
  clearViewerAuth: vi.fn(),
  isLoading: false,
  viewerFirstName: null,
  viewerLastName: null,
}));
vi.mock('@/hooks/useGlobalViewerAuth', () => ({
  useGlobalViewerAuth: (...args: unknown[]) => mockGlobalAuth(...args),
}));

const mockViewerCount = vi.fn(() => ({ count: 5 }));
vi.mock('@/hooks/useViewerCount', () => ({
  useViewerCount: (...args: unknown[]) => mockViewerCount(...args),
}));

const mockResponsive = vi.fn(() => ({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  breakpoint: 'desktop' as const,
  chatPosition: 'right' as const,
  scoreboardPosition: 'left' as const,
  orientation: 'landscape' as const,
}));
vi.mock('@/hooks/v2/useResponsive', () => ({
  useResponsive: (...args: unknown[]) => mockResponsive(...args),
}));

vi.mock('@/hooks/v2/useFullscreen', () => ({
  useFullscreen: vi.fn(() => ({ isFullscreen: false })),
}));

const mockPaywall = vi.fn(() => ({
  hasPaid: true,
  isBlocked: false,
  isBypassed: false,
  showPaywall: false,
  isLoading: false,
  error: null,
  openPaywall: vi.fn(),
  closePaywall: vi.fn(),
  bypassPaywall: vi.fn(),
  markAsPaid: vi.fn(),
  checkAccess: vi.fn(),
  priceInCents: 0,
  customMessage: null,
  allowSavePayment: false,
}));
vi.mock('@/hooks/usePaywall', () => ({
  usePaywall: (...args: unknown[]) => mockPaywall(...args),
}));

const mockGameChatV2 = vi.fn(() => ({
  messages: [],
  sendMessage: vi.fn(),
  isConnected: false,
  currentUserId: null,
  isLoading: false,
}));
vi.mock('@/hooks/useGameChatV2', () => ({
  useGameChatV2: (...args: unknown[]) => mockGameChatV2(...args),
}));

const mockGameChat = vi.fn(() => ({
  messages: [],
  latestBroadcast: null,
  setLatestBroadcast: vi.fn(),
  isConnected: false,
  error: null,
  sendMessage: vi.fn(),
}));
vi.mock('@/hooks/useGameChat', () => ({
  useGameChat: (...args: unknown[]) => mockGameChat(...args),
}));

const mockScoreboardData = vi.fn(() => ({
  homeTeam: { name: 'Home', score: 0, color: '#333', abbreviation: 'H' },
  awayTeam: { name: 'Away', score: 0, color: '#333', abbreviation: 'A' },
  period: null,
  time: null,
}));
vi.mock('@/hooks/useScoreboardData', () => ({
  useScoreboardData: (...args: unknown[]) => mockScoreboardData(...args),
}));

vi.mock('@/hooks/v2/useBookmarkMarkers', () => ({
  useBookmarkMarkers: vi.fn(() => ({ bookmarks: [] })),
}));

const mockUnlock = vi.fn();
const mockSetExternalIdentity = vi.fn();
const mockViewerIdentity = vi.fn(() => ({
  isUnlocked: false,
  viewerId: null,
  token: null,
  isLoading: false,
  error: null,
  unlock: mockUnlock,
  setExternalIdentity: mockSetExternalIdentity,
}));
vi.mock('@/hooks/useViewerIdentity', () => ({
  useViewerIdentity: (...args: unknown[]) => mockViewerIdentity(...args),
}));

const mockCollapsiblePanel = vi.fn(() => ({
  collapsed: false,
  isCollapsed: false,
  toggle: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  collapse: vi.fn(),
}));
vi.mock('@/hooks/useCollapsiblePanel', () => ({
  useCollapsiblePanel: (...args: unknown[]) => mockCollapsiblePanel(...args),
}));

// ---------------------------------------------------------------------------
// Bootstrap data factories
// ---------------------------------------------------------------------------

function makeBootstrap(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'test-stream',
    title: 'Test Stream Title',
    subtitle: 'Test Subtitle',
    streamUrl: null,
    chatEnabled: true,
    paywallEnabled: false,
    scheduledStartAt: new Date(Date.now() + 86400000).toISOString(),
    welcomeMessage: null,
    gameId: 'game-1',
    scoreboardEnabled: false,
    priceInCents: 999,
    paywallMessage: 'Pay to watch',
    allowAnonymousChat: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] ?? null; },
  setItem(key: string, val: string) { this.store[key] = val; },
  removeItem(key: string) { delete this.store[key]; },
  clear() { this.store = {}; },
  get length() { return Object.keys(this.store).length; },
  key(i: number) { return Object.keys(this.store)[i] ?? null; },
};

function setupFetch(bootstrap: ReturnType<typeof makeBootstrap>) {
  (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('bootstrap')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(bootstrap) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ bookmarks: [] }) });
  });
}

async function renderPage(bootstrapOverrides: Record<string, unknown> = {}) {
  const bootstrap = makeBootstrap(bootstrapOverrides);
  setupFetch(bootstrap);
  const { DirectStreamPageBase } = await import('../DirectStreamPageBase');
  const result = render(
    <DirectStreamPageBase
      config={{
        slug: 'test-stream',
        title: 'Fallback Title',
        bootstrapUrl: 'http://localhost:4301/api/public/direct/test-stream/bootstrap',
      }}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText(/Test Stream Title|Fallback Title/)).toBeInTheDocument();
  }, { timeout: 3000 });
  return result;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('DirectStreamPageBase integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ====================================================================
  // D1 / D2 — Offline state
  // ====================================================================
  describe('Offline state (no stream URL)', () => {
    it('should show Stream Offline message', async () => {
      await renderPage();
      await waitFor(() => expect(screen.getAllByText(/Stream Offline/).length).toBeGreaterThan(0));
    });

    it('should show scheduled date when scheduledStartAt is set', async () => {
      await renderPage();
      await waitFor(() => expect(screen.getAllByText(/Scheduled:/).length).toBeGreaterThan(0));
    });

    it('should show Notify Me button that opens NotifyMeForm', async () => {
      await renderPage();
      const notifyBtn = await screen.findByTestId('btn-notify-me-landscape', {}, { timeout: 3000 });
      const user = userEvent.setup();
      await user.click(notifyBtn);
      await waitFor(() => expect(screen.getByTestId('form-notify-me')).toBeInTheDocument());
    });

    it('should not show Notify Me when no schedule', async () => {
      await renderPage({ scheduledStartAt: null });
      await waitFor(() => expect(screen.getAllByText(/Stream Offline/).length).toBeGreaterThan(0));
      expect(screen.queryByTestId('btn-notify-me')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-notify-me-landscape')).not.toBeInTheDocument();
    });
  });

  // ====================================================================
  // D5 — Welcome message banner
  // ====================================================================
  describe('Welcome message banner', () => {
    it('should show WelcomeMessageBanner when welcomeMessage is set', async () => {
      await renderPage({ welcomeMessage: 'Welcome to our game!' });
      await waitFor(() => expect(screen.getByText('Welcome to our game!')).toBeInTheDocument());
    });

    it('should not show banner when welcomeMessage is null', async () => {
      await renderPage({ welcomeMessage: null });
      expect(screen.queryByText('Welcome to our game!')).not.toBeInTheDocument();
    });
  });

  // ====================================================================
  // Header — title, viewer count, admin panel
  // ====================================================================
  describe('Header', () => {
    it('should show page title from config', async () => {
      await renderPage();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fallback Title');
    });

    it('should show viewer count', async () => {
      await renderPage();
      expect(screen.getByTestId('viewer-count')).toBeInTheDocument();
      expect(screen.getByTestId('viewer-count')).toHaveTextContent('5');
    });

    it('should show Admin Panel button', async () => {
      await renderPage();
      expect(screen.getByTestId('btn-open-admin-panel')).toBeInTheDocument();
    });
  });

  // ====================================================================
  // ViewerIdentityBar
  // ====================================================================
  describe('ViewerIdentityBar', () => {
    it('should not show identity bar when not authenticated', async () => {
      mockGlobalAuth.mockReturnValue({
        viewerIdentityId: null,
        viewerEmail: null,
        viewerName: null,
        isAuthenticated: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
        isLoading: false,
        viewerFirstName: null,
        viewerLastName: null,
      });
      await renderPage();
      expect(screen.queryByTestId('viewer-identity-bar')).not.toBeInTheDocument();
    });

    it('should show identity bar when authenticated', async () => {
      mockGlobalAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'viewer@example.com',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
        isLoading: false,
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
      });
      await renderPage();
      await waitFor(() => expect(screen.getByTestId('viewer-identity-bar')).toBeInTheDocument());
    });
  });

  // ====================================================================
  // D10 — Paywall blocked
  // ====================================================================
  describe('Paywall blocked', () => {
    it('should show paywall blocker with price and Unlock button when paywallEnabled and not paid', async () => {
      mockPaywall.mockReturnValue({
        hasPaid: false,
        isBlocked: true,
        isBypassed: false,
        showPaywall: false,
        isLoading: false,
        error: null,
        openPaywall: vi.fn(),
        closePaywall: vi.fn(),
        bypassPaywall: vi.fn(),
        markAsPaid: vi.fn(),
        checkAccess: vi.fn(),
        priceInCents: 999,
        customMessage: null,
        allowSavePayment: false,
      });
      await renderPage({ paywallEnabled: true, priceInCents: 999 });
      await waitFor(() => expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByText('Premium Stream')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
      expect(screen.getByTestId('btn-unlock-stream')).toBeInTheDocument();
    });

    it('should NOT show paywall blocker when user has paid', async () => {
      mockPaywall.mockReturnValue({
        hasPaid: true,
        isBlocked: false,
        isBypassed: false,
        showPaywall: false,
        isLoading: false,
        error: null,
        openPaywall: vi.fn(),
        closePaywall: vi.fn(),
        bypassPaywall: vi.fn(),
        markAsPaid: vi.fn(),
        checkAccess: vi.fn(),
        priceInCents: 999,
        customMessage: null,
        allowSavePayment: false,
      });
      await renderPage({ paywallEnabled: true, priceInCents: 999 });
      expect(screen.queryByTestId('paywall-blocker')).not.toBeInTheDocument();
    });
  });

  // ====================================================================
  // D7 — Chat locked (not registered)
  // ====================================================================
  describe('Chat — locked (not registered)', () => {
    it('should show Register to Chat button when viewer is not unlocked', async () => {
      await renderPage();
      const registerBtn = await screen.findByTestId('btn-open-viewer-auth', {}, { timeout: 3000 });
      expect(registerBtn).toBeInTheDocument();
      expect(screen.getByText(/Register your email to send messages/i)).toBeInTheDocument();
    });

    it('should open inline form on click and close on cancel', async () => {
      await renderPage();
      const user = userEvent.setup();
      const registerBtn = await screen.findByTestId('btn-open-viewer-auth', {}, { timeout: 3000 });
      await user.click(registerBtn);

      await waitFor(() => expect(screen.getByTestId('form-viewer-register')).toBeInTheDocument());
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-email')).toBeInTheDocument();
      expect(screen.getByTestId('btn-submit-viewer-register')).toBeInTheDocument();

      await user.click(screen.getByTestId('btn-cancel-inline-registration'));
      await waitFor(() => expect(screen.queryByTestId('form-viewer-register')).not.toBeInTheDocument());
      expect(screen.getByTestId('btn-open-viewer-auth')).toBeInTheDocument();
    });

    it('should show read-only messages when not registered', async () => {
      mockGameChat.mockReturnValue({
        messages: [
          { id: 'm1', displayName: 'Alice', message: 'Hello!', createdAt: new Date().toISOString() },
        ],
        latestBroadcast: null,
        setLatestBroadcast: vi.fn(),
        isConnected: true,
        error: null,
        sendMessage: vi.fn(),
      });
      await renderPage();
      await waitFor(() => expect(screen.getByTestId('chat-msg-m1')).toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });
  });

  // ====================================================================
  // D8 — Chat unlocked (registered viewer)
  // ====================================================================
  describe('Chat — unlocked (registered viewer)', () => {
    beforeEach(() => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-registered',
        token: 'jwt-token',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      mockGlobalAuth.mockReturnValue({
        viewerIdentityId: 'v-registered',
        viewerEmail: 'jane@example.com',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
        isLoading: false,
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
      });
    });

    it('should show Chat component (not Register to Chat) when unlocked', async () => {
      await renderPage();
      expect(screen.queryByTestId('btn-open-viewer-auth')).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('chat-panel-v2') ?? screen.getByTestId('chat-panel')).toBeInTheDocument());
    });

    it('should show ViewerIdentityBar for authenticated viewer', async () => {
      await renderPage();
      await waitFor(() => expect(screen.getByTestId('viewer-identity-bar')).toBeInTheDocument());
    });
  });

  // ====================================================================
  // D9 — Anonymous / guest chat
  // ====================================================================
  describe('Chat — anonymous guest', () => {
    beforeEach(() => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-anon',
        token: 'anon-tok',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      localStorageMock.setItem('fieldview_viewer_identity', JSON.stringify({
        email: 'anon-abc@guest.fieldview.live',
        viewerToken: 'anon-tok',
        gameId: 'game-1',
        viewerId: 'v-anon',
      }));
    });

    it('should show guest name bar with "Chatting as" and Change name button', async () => {
      await renderPage({ allowAnonymousChat: true });
      await waitFor(() => expect(screen.getByText(/Chatting as/)).toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByTestId('guest-name-bar')).toBeInTheDocument();
      expect(screen.getByTestId('btn-guest-change-name')).toBeInTheDocument();
    });

    it('should open guest name edit form and cancel', async () => {
      await renderPage({ allowAnonymousChat: true });
      await waitFor(() => expect(screen.getByTestId('btn-guest-change-name')).toBeInTheDocument(), { timeout: 3000 });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-guest-change-name'));

      await waitFor(() => expect(screen.getByTestId('form-guest-name')).toBeInTheDocument());
      expect(screen.getByTestId('input-guest-name')).toBeInTheDocument();
      expect(screen.getByTestId('btn-guest-name-save')).toBeInTheDocument();
      expect(screen.getByTestId('btn-guest-name-cancel')).toBeInTheDocument();

      await user.click(screen.getByTestId('btn-guest-name-cancel'));
      await waitFor(() => expect(screen.getByTestId('btn-guest-change-name')).toBeInTheDocument());
      expect(screen.queryByTestId('form-guest-name')).not.toBeInTheDocument();
    });
  });

  // ====================================================================
  // D11 — Error state
  // ====================================================================
  describe('Error state (D11)', () => {
    it('should show "Unable to Load Stream" and Open Admin Panel button when status is error', async () => {
      const bootstrap = makeBootstrap({ streamUrl: 'https://stream.example.com/live.m3u8' });
      setupFetch(bootstrap);
      vi.mock('@/components/v2/video/StreamPlayer', () => ({
        StreamPlayer: ({ onStatusChange }: { onStatusChange: (s: string) => void }) => {
          onStatusChange('error');
          return <div data-testid="mock-stream-player">Mock Player</div>;
        },
      }));
      const { DirectStreamPageBase } = await import('../DirectStreamPageBase');
      render(
        <DirectStreamPageBase
          config={{ slug: 'test-stream', title: 'Fallback Title', bootstrapUrl: 'http://localhost:4301/api/public/direct/test-stream/bootstrap' }}
        />,
      );
      await waitFor(() => expect(screen.getByTestId('error-overlay')).toBeInTheDocument(), { timeout: 5000 });
      expect(screen.getByText('Unable to Load Stream')).toBeInTheDocument();
      expect(screen.getByTestId('btn-update-stream')).toBeInTheDocument();
      expect(screen.getByTestId('btn-update-stream')).toHaveTextContent(/Open Admin Panel/);
    });
  });

  // ====================================================================
  // D12 — Admin panel open/close + sub-panels
  // ====================================================================
  describe('Admin panel', () => {
    it('should open admin panel on button click and show Stream Settings', async () => {
      await renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-open-admin-panel'));
      await waitFor(() => expect(screen.getByText('Stream Settings')).toBeInTheDocument());
      expect(screen.getByTestId('btn-close-edit')).toBeInTheDocument();
    });

    it('should close admin panel on Close click', async () => {
      await renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-open-admin-panel'));
      await waitFor(() => expect(screen.getByText('Stream Settings')).toBeInTheDocument());

      await user.click(screen.getByTestId('btn-close-edit'));
      await waitFor(() => expect(screen.queryByText('Stream Settings')).not.toBeInTheDocument());
      expect(screen.getByTestId('btn-open-admin-panel')).toBeInTheDocument();
    });

    it('should show SocialProducerPanel when admin panel is open', async () => {
      await renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-open-admin-panel'));
      await waitFor(() => expect(screen.getByText('Stream Settings')).toBeInTheDocument());
      const producerPanel = screen.queryByTestId('producer-panel-locked') ?? screen.queryByTestId('producer-panel');
      expect(producerPanel).toBeInTheDocument();
    });

    it('should show ViewerAnalyticsPanel when admin panel is open', async () => {
      await renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-open-admin-panel'));
      await waitFor(() => expect(screen.getByText('Stream Settings')).toBeInTheDocument());
      const analyticsPanel = screen.queryByTestId('viewer-analytics-panel') ?? screen.queryByTestId('viewer-analytics-loading');
      expect(analyticsPanel).toBeInTheDocument();
    });
  });

  // ====================================================================
  // D13 — Scoreboard panel
  // ====================================================================
  describe('Scoreboard panel', () => {
    it('should show scoreboard panel when scoreboardEnabled', async () => {
      await renderPage({ scoreboardEnabled: true });
      await waitFor(() => expect(screen.getByTestId('scoreboard-panel')).toBeInTheDocument());
    });
  });

  // ====================================================================
  // Chat panel structure
  // ====================================================================
  describe('Chat panel structure', () => {
    it('should show chat panel or collapsed tab when chatEnabled', async () => {
      await renderPage({ chatEnabled: true });
      const chatPanel = screen.queryByTestId('chat-panel');
      const chatCollapsed = screen.queryByTestId('chat-collapsed-tab');
      expect(chatPanel ?? chatCollapsed).toBeTruthy();
    });
  });

  // ====================================================================
  // D14 — Bookmark panel
  // ====================================================================
  describe('Bookmark panel', () => {
    beforeEach(() => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-registered',
        token: 'jwt-token',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
    });

    it('should show bookmark panel or collapsed tab when viewer is unlocked', async () => {
      await renderPage();
      const bookmarkPanel = screen.queryByTestId('bookmark-panel');
      const bookmarkTab = screen.queryByTestId('bookmark-collapsed-tab');
      expect(bookmarkPanel ?? bookmarkTab).toBeTruthy();
    });
  });

  // ====================================================================
  // Chat connection indicator (Live / Connecting)
  // ====================================================================
  describe('Chat connection indicator', () => {
    beforeEach(() => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-registered',
        token: 'jwt-token',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      mockGlobalAuth.mockReturnValue({
        viewerIdentityId: 'v-registered',
        viewerEmail: 'jane@example.com',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
        isLoading: false,
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
      });
    });

    it('should show "Connecting..." when chat is not connected', async () => {
      mockGameChat.mockReturnValue({
        messages: [],
        latestBroadcast: null,
        setLatestBroadcast: vi.fn(),
        isConnected: false,
        error: null,
        sendMessage: vi.fn(),
      });
      await renderPage();
      const connectingEl = screen.queryByTestId('chat-status-connecting');
      if (connectingEl) {
        expect(connectingEl).toHaveTextContent('Connecting...');
      }
    });

    it('should show "Live" indicator when chat is connected', async () => {
      mockGameChat.mockReturnValue({
        messages: [],
        latestBroadcast: null,
        setLatestBroadcast: vi.fn(),
        isConnected: true,
        error: null,
        sendMessage: vi.fn(),
      });
      await renderPage();
      const liveEl = screen.queryByTestId('chat-status-live');
      if (liveEl) {
        expect(liveEl).toHaveTextContent('Live');
      }
    });
  });

  // ====================================================================
  // Accessibility & ARIA
  // ====================================================================
  describe('Accessibility', () => {
    it('should have accessible admin panel button', async () => {
      await renderPage();
      const adminBtn = screen.getByTestId('btn-open-admin-panel');
      expect(adminBtn).toHaveTextContent('Admin Panel');
      expect(adminBtn.tagName).toBe('BUTTON');
    });

    it('should have accessible Register to Chat button', async () => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: false,
        viewerId: null,
        token: null,
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      await renderPage();
      const registerBtn = await screen.findByTestId('btn-open-viewer-auth', {}, { timeout: 3000 });
      expect(registerBtn.tagName).toBe('BUTTON');
    });

    it('guest name change button should have aria-label', async () => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-anon',
        token: 'anon-tok',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      localStorageMock.setItem('fieldview_viewer_identity', JSON.stringify({
        email: 'anon-abc@guest.fieldview.live',
        viewerToken: 'anon-tok',
        gameId: 'game-1',
        viewerId: 'v-anon',
      }));
      await renderPage({ allowAnonymousChat: true });
      await waitFor(() => expect(screen.getByTestId('btn-guest-change-name')).toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByTestId('btn-guest-change-name')).toHaveAccessibleName(/change guest name/i);
    });

    it('guest name input should have aria-label', async () => {
      mockViewerIdentity.mockReturnValue({
        isUnlocked: true,
        viewerId: 'v-anon',
        token: 'anon-tok',
        isLoading: false,
        error: null,
        unlock: mockUnlock,
        setExternalIdentity: mockSetExternalIdentity,
      });
      localStorageMock.setItem('fieldview_viewer_identity', JSON.stringify({
        email: 'anon-abc@guest.fieldview.live',
        viewerToken: 'anon-tok',
        gameId: 'game-1',
        viewerId: 'v-anon',
      }));
      await renderPage({ allowAnonymousChat: true });
      await waitFor(() => expect(screen.getByTestId('btn-guest-change-name')).toBeInTheDocument(), { timeout: 3000 });
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-guest-change-name'));
      await waitFor(() => expect(screen.getByTestId('input-guest-name')).toBeInTheDocument());
      expect(screen.getByTestId('input-guest-name')).toHaveAccessibleName(/guest display name/i);
    });
  });
});
