/**
 * Tests for Request Password Reset Page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestPasswordResetPage from '../page';

// Mock Next.js navigation
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock fetch
global.fetch = vi.fn();

describe('RequestPasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with all elements', () => {
    render(<RequestPasswordResetPage />);

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByTestId('radio-owner-user')).toBeInTheDocument();
    expect(screen.getByTestId('radio-admin-account')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit')).toBeInTheDocument();
  });

  it('should have owner_user selected by default', () => {
    render(<RequestPasswordResetPage />);

    const ownerRadio = screen.getByTestId('radio-owner-user') as HTMLInputElement;
    expect(ownerRadio.checked).toBe(true);
  });

  // Note: Email validation happens on submit, so we test successful validation flow
  it('should require a valid email format', async () => {
    const user = userEvent.setup();
    render(<RequestPasswordResetPage />);

    const submitButton = screen.getByTestId('btn-submit');

    // Try to submit without entering email (empty is invalid)
    await user.click(submitButton);

    // Form should not be submitted (tested indirectly by checking no API call was made)
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should successfully submit the form', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Email sent' }),
    } as Response);

    render(<RequestPasswordResetPage />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/password-reset/request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            userType: 'owner_user',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
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

    render(<RequestPasswordResetPage />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Too many requests');
    });
  });

  it('should allow switching between user types', async () => {
    const user = userEvent.setup();
    render(<RequestPasswordResetPage />);

    const ownerRadio = screen.getByTestId('radio-owner-user') as HTMLInputElement;
    const adminRadio = screen.getByTestId('radio-admin-account') as HTMLInputElement;

    expect(ownerRadio.checked).toBe(true);
    expect(adminRadio.checked).toBe(false);

    await user.click(adminRadio);

    expect(ownerRadio.checked).toBe(false);
    expect(adminRadio.checked).toBe(true);
  });

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Email sent' }),
    } as Response);

    render(<RequestPasswordResetPage />);

    const emailInput = screen.getByTestId('input-email') as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByTestId('btn-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });

    // Form should be cleared
    expect(emailInput.value).toBe('');
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

    render(<RequestPasswordResetPage />);

    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByTestId('btn-submit');

    await user.type(emailInput, 'test@example.com');
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
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
  });
});

