/**
 * Notify-Me User Journey Tests
 *
 * Integration tests that simulate real user experience flows by composing
 * NotifyMeForm + ViewerIdentityBar together with shared auth state.
 *
 * Journeys tested:
 * 1. New viewer subscribes via email -> becomes "logged in" -> sees identity bar
 * 2. Returning (authenticated) viewer -> one-tap subscribe -> success with unsubscribe
 * 3. Authenticated viewer signs out -> form resets to email input, identity bar gone
 * 4. Full subscribe -> unsubscribe -> re-subscribe cycle
 * 5. New viewer with network errors -> retry flow
 */

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useState, useCallback } from 'react';
import { NotifyMeForm } from '../NotifyMeForm';
import { ViewerIdentityBar } from '../ViewerIdentityBar';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockClearViewerAuth = vi.fn();
const mockSetViewerAuth = vi.fn();

vi.mock('@/hooks/useGlobalViewerAuth', () => ({
  useGlobalViewerAuth: vi.fn(),
}));

import { useGlobalViewerAuth } from '@/hooks/useGlobalViewerAuth';

const defaultProps = {
  slug: 'tchs',
  apiBase: 'https://api.fieldview.live',
};

function mockAuth(overrides: Partial<ReturnType<typeof useGlobalViewerAuth>> = {}) {
  vi.mocked(useGlobalViewerAuth).mockReturnValue({
    viewerName: null,
    viewerEmail: null,
    isAuthenticated: false,
    clearViewerAuth: mockClearViewerAuth,
    isLoading: false,
    viewerIdentityId: null,
    viewerFirstName: null,
    viewerLastName: null,
    setViewerAuth: mockSetViewerAuth,
    ...overrides,
  });
}

/**
 * Renders the NotifyMeForm + ViewerIdentityBar side-by-side,
 * simulating what DirectStreamPageBase does.
 */
function StreamPage({
  authenticated,
  viewerEmail,
  viewerIdentityId,
  viewerName,
}: {
  authenticated: boolean;
  viewerEmail?: string | null;
  viewerIdentityId?: string | null;
  viewerName?: string | null;
}) {
  return (
    <div>
      <ViewerIdentityBar />
      <NotifyMeForm
        {...defaultProps}
        viewerEmail={authenticated ? viewerEmail : undefined}
        viewerIdentityId={authenticated ? viewerIdentityId : undefined}
        viewerName={authenticated ? viewerName : undefined}
        onViewerCreated={(viewerId, email) => {
          mockSetViewerAuth({ viewerIdentityId: viewerId, email });
        }}
      />
    </div>
  );
}

describe('Notify-Me User Journeys', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockClearViewerAuth.mockClear();
    mockSetViewerAuth.mockClear();
  });

  describe('Journey 1: New viewer subscribes via email -> becomes logged in', () => {
    it('should show email form, subscribe, trigger onViewerCreated, and show success', async () => {
      mockAuth();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'subscribed', viewerId: 'new-viewer-1' }),
      });

      render(<StreamPage authenticated={false} />);

      // Identity bar should NOT be visible
      expect(screen.queryByTestId('viewer-identity-bar')).not.toBeInTheDocument();

      // Email form should be visible
      expect(screen.getByTestId('form-notify-me')).toBeInTheDocument();
      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toBeInTheDocument();

      // Type email and submit
      await userEvent.type(emailInput, 'newuser@example.com');
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me'));
      });

      // Wait for success
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });
      expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();

      // Should have called setViewerAuth to "log in" the user
      expect(mockSetViewerAuth).toHaveBeenCalledWith({
        viewerIdentityId: 'new-viewer-1',
        email: 'newuser@example.com',
      });

      // Should have called the API correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.fieldview.live/api/public/direct/tchs/notify-me',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'newuser@example.com' }),
        }),
      );
    });
  });

  describe('Journey 2: Authenticated viewer -> one-tap subscribe -> success with unsubscribe', () => {
    it('should show one-tap form, subscribe, show success with unsubscribe option', async () => {
      mockAuth({
        isAuthenticated: true,
        viewerEmail: 'alice@example.com',
        viewerIdentityId: 'viewer-alice',
        viewerName: 'Alice Smith',
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'viewer-alice' }) });

      render(<StreamPage authenticated viewerEmail="alice@example.com" viewerIdentityId="viewer-alice" viewerName="Alice Smith" />);

      // Identity bar should show "Alice Smith"
      expect(screen.getByTestId('viewer-identity-bar')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByTestId('btn-viewer-logout')).toBeInTheDocument();

      // Wait for status check + one-tap form
      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('input-email')).not.toBeInTheDocument();
      const subscribeBtn = screen.getByTestId('btn-notify-me-subscribe');
      expect(subscribeBtn).toBeInTheDocument();

      // Subscribe with one tap
      await act(async () => {
        fireEvent.click(subscribeBtn);
      });

      // Should see success with unsubscribe option
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });
      expect(screen.getByTestId('btn-unsubscribe')).toBeInTheDocument();
      expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();

      // Verify API was called with viewerIdentityId (not email)
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api.fieldview.live/api/public/direct/tchs/notify-me',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ viewerIdentityId: 'viewer-alice' }),
        }),
      );

      // onViewerCreated should NOT be called (already authenticated)
      expect(mockSetViewerAuth).not.toHaveBeenCalled();
    });
  });

  describe('Journey 3: Authenticated viewer already subscribed -> sees success immediately', () => {
    it('should check status, find subscribed, show success without extra form interaction', async () => {
      mockAuth({
        isAuthenticated: true,
        viewerEmail: 'bob@example.com',
        viewerIdentityId: 'viewer-bob',
        viewerName: 'Bob',
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: true }) });

      render(<StreamPage authenticated viewerEmail="bob@example.com" viewerIdentityId="viewer-bob" viewerName="Bob" />);

      // Identity bar shows "Bob"
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // Should skip the form and go straight to success
      expect(await screen.findByTestId('notify-me-success')).toBeInTheDocument();
      expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-unsubscribe')).toBeInTheDocument();

      // No email input should have appeared
      expect(screen.queryByTestId('input-email')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-notify-me-subscribe')).not.toBeInTheDocument();
    });
  });

  describe('Journey 4: Full subscribe -> unsubscribe -> re-subscribe cycle', () => {
    it('should support full lifecycle: subscribe, see success, unsubscribe, re-subscribe', async () => {
      mockAuth({
        isAuthenticated: true,
        viewerEmail: 'carol@example.com',
        viewerIdentityId: 'viewer-carol',
        viewerName: 'Carol',
      });

      // 1. Status check: not subscribed
      // 2. POST subscribe: success
      // 3. DELETE unsubscribe: success
      // 4. POST re-subscribe: success
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'viewer-carol' }) })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'viewer-carol' }) });

      render(<StreamPage authenticated viewerEmail="carol@example.com" viewerIdentityId="viewer-carol" viewerName="Carol" />);

      // Wait for one-tap form
      await waitFor(() => {
        expect(screen.getByTestId('btn-notify-me-subscribe')).toBeInTheDocument();
      });

      // Step 1: Subscribe
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me-subscribe'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });

      // Step 2: Unsubscribe
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-unsubscribe'));
      });
      await waitFor(() => {
        expect(screen.queryByTestId('notify-me-success')).not.toBeInTheDocument();
        expect(screen.getByTestId('btn-notify-me-subscribe')).toBeInTheDocument();
      });

      // Verify DELETE was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.fieldview.live/api/public/direct/tchs/notify-me',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ viewerIdentityId: 'viewer-carol' }),
        }),
      );

      // Step 3: Re-subscribe
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me-subscribe'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });
    });
  });

  describe('Journey 5: Status check fails -> retry -> then subscribe', () => {
    it('should show error, allow retry, then proceed normally', async () => {
      mockAuth({
        isAuthenticated: true,
        viewerEmail: 'dave@example.com',
        viewerIdentityId: 'viewer-dave',
        viewerName: 'Dave',
      });

      // 1. Status check fails
      // 2. Status check retry succeeds (not subscribed)
      // 3. POST subscribe succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'viewer-dave' }) });

      render(<StreamPage authenticated viewerEmail="dave@example.com" viewerIdentityId="viewer-dave" viewerName="Dave" />);

      // Should show status error
      expect(await screen.findByTestId('error-notify-me-status')).toBeInTheDocument();
      expect(screen.getByText(/couldn't check subscription status/i)).toBeInTheDocument();

      // Retry
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-retry-status'));
      });

      // Error should clear, form should appear
      await waitFor(() => {
        expect(screen.queryByTestId('error-notify-me-status')).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByTestId('btn-notify-me-subscribe')).toBeInTheDocument();
      });

      // Now subscribe
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me-subscribe'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });
    });
  });

  describe('Journey 6: Unauthenticated email form -> error recovery', () => {
    it('should show error on failed submit, allow retry, and succeed', async () => {
      mockAuth();

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'v-retry' }) });

      render(<StreamPage authenticated={false} />);

      const emailInput = screen.getByTestId('input-email');
      await userEvent.type(emailInput, 'retry@example.com');

      // First attempt fails
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('error-notify-me')).toBeInTheDocument();
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Email should still be in the input (not cleared)
      expect(screen.getByTestId('input-email')).toHaveValue('retry@example.com');

      // Retry
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });

      expect(mockSetViewerAuth).toHaveBeenCalledWith({
        viewerIdentityId: 'v-retry',
        email: 'retry@example.com',
      });
    });
  });

  describe('Journey 7: Identity bar sign-out triggers clearViewerAuth', () => {
    it('should call clearViewerAuth when Sign out is clicked', () => {
      mockAuth({
        isAuthenticated: true,
        viewerEmail: 'eve@example.com',
        viewerIdentityId: 'viewer-eve',
        viewerName: 'Eve',
      });

      // Status check mock (for the NotifyMeForm useEffect)
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) });

      render(<StreamPage authenticated viewerEmail="eve@example.com" viewerIdentityId="viewer-eve" viewerName="Eve" />);

      expect(screen.getByText('Eve')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('btn-viewer-logout'));
      expect(mockClearViewerAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Journey 8: No unsubscribe button for unauthenticated email-only subscriptions', () => {
    it('should show success without unsubscribe when no viewerIdentityId', async () => {
      mockAuth();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'subscribed', viewerId: 'v-anon' }),
      });

      render(<StreamPage authenticated={false} />);

      await userEvent.type(screen.getByTestId('input-email'), 'anon@example.com');
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-notify-me'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('notify-me-success')).toBeInTheDocument();
      });

      // No unsubscribe for unauthenticated users
      expect(screen.queryByTestId('btn-unsubscribe')).not.toBeInTheDocument();
    });
  });
});
