/**
 * NotifyMeForm Component Tests (TDD — RED phase)
 *
 * Tests the lightweight email-only "notify me" signup form.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotifyMeForm } from '../NotifyMeForm';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('NotifyMeForm', () => {
  const defaultProps = {
    slug: 'tchs',
    apiBase: 'https://api.fieldview.live',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('rendering', () => {
    it('should render email input and submit button', () => {
      render(<NotifyMeForm {...defaultProps} />);

      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /notify me/i })).toBeInTheDocument();
    });

    it('should disable submit button when email is empty', () => {
      render(<NotifyMeForm {...defaultProps} />);

      const button = screen.getByRole('button', { name: /notify me/i });
      expect(button).toBeDisabled();
    });
  });

  describe('submission', () => {
    it('should show loading state on submit', async () => {
      let resolveSubmit: (value: unknown) => void;
      mockFetch.mockReturnValue(new Promise((r) => { resolveSubmit = r; }));

      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      const button = screen.getByRole('button', { name: /notify me/i });

      await userEvent.type(input, 'alice@example.com');
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      await act(async () => {
        resolveSubmit!({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'v-1' }) });
      });
      await waitFor(() => {
        expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();
      });
    });

    it('should call API with correct body on submit', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'subscribed', viewerId: 'v-1' }),
      });

      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'alice@example.com');
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.fieldview.live/api/public/direct/tchs/notify-me',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email: 'alice@example.com' }),
          }),
        );
      });
    });

    it('should show success state after subscribe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'subscribed', viewerId: 'v-1' }),
      });

      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'alice@example.com');
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      await waitFor(() => {
        expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();
      });
    });

    it('should show error state on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Stream not found' }),
      });

      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'alice@example.com');
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should prevent double-submit', async () => {
      let resolveSubmit: (value: unknown) => void;
      mockFetch.mockReturnValue(new Promise((r) => { resolveSubmit = r; }));

      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'alice@example.com');

      const button = screen.getByRole('button', { name: /notify me/i });
      await act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
      fireEvent.click(button); // Second click while disabled should not trigger fetch

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSubmit!({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'v-1' }) });
      });
      await waitFor(() => {
        expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('should not submit with invalid email format', async () => {
      render(<NotifyMeForm {...defaultProps} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'not-an-email');
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      // Fetch should not be called for invalid email
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('auth-aware (one-tap)', () => {
    it('should show one-tap subscribe when viewerEmail and viewerIdentityId provided', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'subscribed', viewerId: 'v-1' }) });

      render(
        <NotifyMeForm
          {...defaultProps}
          viewerEmail="alice@example.com"
          viewerIdentityId="viewer-123"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'https://api.fieldview.live/api/public/direct/tchs/notify-me',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ viewerIdentityId: 'viewer-123' }),
          }),
        );
      });
    });

    it('should call onViewerCreated when subscribing with email and callback provided', async () => {
      const onViewerCreated = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'subscribed', viewerId: 'v-99' }),
      });

      render(<NotifyMeForm {...defaultProps} onViewerCreated={onViewerCreated} />);

      const input = screen.getByPlaceholderText(/email/i);
      await userEvent.type(input, 'bob@example.com');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /notify me/i }));
      });

      await act(async () => {
        await waitFor(() => {
          expect(onViewerCreated).toHaveBeenCalledWith('v-99', 'bob@example.com');
        });
      });
    });

    it('should show success when status check returns subscribed', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: true }) });

      render(
        <NotifyMeForm
          {...defaultProps}
          viewerEmail="alice@example.com"
          viewerIdentityId="viewer-123"
        />,
      );

      expect(await screen.findByTestId('notify-me-success')).toBeInTheDocument();
      expect(screen.getByText(/you.*notified/i)).toBeInTheDocument();
    });

    it('should show status error and retry when GET status fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      render(
        <NotifyMeForm
          {...defaultProps}
          viewerEmail="alice@example.com"
          viewerIdentityId="viewer-123"
        />,
      );

      expect(await screen.findByTestId('error-notify-me-status')).toBeInTheDocument();
      expect(screen.getByText(/couldn't check subscription status/i)).toBeInTheDocument();

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: false }) });
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-retry-status'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('error-notify-me-status')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('should show Unsubscribe in success and call DELETE on click', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ subscribed: true }) });

      render(
        <NotifyMeForm
          {...defaultProps}
          viewerEmail="alice@example.com"
          viewerIdentityId="viewer-123"
        />,
      );

      expect(await screen.findByTestId('notify-me-success')).toBeInTheDocument();
      const unsubscribeBtn = screen.getByTestId('btn-unsubscribe');
      expect(unsubscribeBtn).toBeInTheDocument();

      mockFetch.mockResolvedValueOnce({ ok: true });
      await act(async () => {
        fireEvent.click(unsubscribeBtn);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'https://api.fieldview.live/api/public/direct/tchs/notify-me',
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ viewerIdentityId: 'viewer-123' }),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
      });
    });
  });
});
