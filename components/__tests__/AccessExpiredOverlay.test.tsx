/**
 * Tests for Access Expired Overlay
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessExpiredOverlay } from '../AccessExpiredOverlay';

// Mock fetch
global.fetch = vi.fn();

describe('AccessExpiredOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/direct/test-stream' },
      writable: true,
    });
  });

  it('should render the overlay with all elements', () => {
    render(<AccessExpiredOverlay streamTitle="Test Stream" streamId="stream-123" />);

    expect(screen.getByTestId('access-expired-overlay')).toBeInTheDocument();
    expect(screen.getByText('Your Access Has Expired')).toBeInTheDocument();
    expect(screen.getByText('Test Stream')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit')).toBeInTheDocument();
  });

  it('should render without stream title', () => {
    render(<AccessExpiredOverlay streamId="stream-123" />);

    expect(screen.getByText('Your Access Has Expired')).toBeInTheDocument();
    expect(screen.queryByText('Test Stream')).not.toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<AccessExpiredOverlay streamId="stream-123" />);

    const submitButton = screen.getByTestId('btn-submit');

    // Try to submit without email
    await user.click(submitButton);

    // Fetch should not be called with invalid form
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should successfully submit the form', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<AccessExpiredOverlay streamTitle="Test Stream" streamId="stream-123" />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'viewer@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/viewer-refresh/request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'viewer@example.com',
            directStreamId: 'stream-123',
            redirectUrl: '/direct/test-stream',
          }),
        })
      );
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });
  });

  it('should show rate limit error', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many requests' }),
    } as Response);

    render(<AccessExpiredOverlay streamId="stream-123" />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'viewer@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Too many requests');
    });
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    render(<AccessExpiredOverlay streamId="stream-123" onClose={onCloseMock} />);

    const cancelButton = screen.getByTestId('btn-cancel');
    await user.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledOnce();
  });

  it('should call onClose when success close button is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<AccessExpiredOverlay streamId="stream-123" onClose={onCloseMock} />);

    const emailInput = screen.getByTestId('input-email');
    await user.type(emailInput, 'viewer@example.com');
    await user.click(screen.getByTestId('btn-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-close-success')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('btn-close-success'));
    expect(onCloseMock).toHaveBeenCalledOnce();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    
    // Create a promise that we can control
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(promise as any);

    render(<AccessExpiredOverlay streamId="stream-123" />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'viewer@example.com');
    await user.click(submitButton);

    // Should show loading state
    expect(submitButton).toHaveTextContent('Sending...');
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => ({ success: true }),
    });

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    render(<AccessExpiredOverlay streamId="stream-123" />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'viewer@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Server error');
    });
  });

  it('should not show cancel button when onClose is not provided', () => {
    render(<AccessExpiredOverlay streamId="stream-123" />);

    expect(screen.queryByTestId('btn-cancel')).not.toBeInTheDocument();
  });
});

