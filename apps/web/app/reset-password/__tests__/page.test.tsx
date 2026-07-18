/**
 * Tests for Reset Password Page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '../page';

// Mock Next.js modules
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === 'token' ? 'test-token-123' : null)),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for token verification
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should verify token on mount', async () => {
    const mockFetch = vi.mocked(fetch);
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/password-reset/verify/test-token-123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });
  });

  it('should show error for invalid token', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid token' }),
    } as Response);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
      expect(screen.getByText('Invalid token')).toBeInTheDocument();
    });
  });

  it('should validate password requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password');
    const submitButton = screen.getByTestId('btn-submit-reset');

    // Test weak password
    await user.type(passwordInput, 'weak');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-new-password')).toBeInTheDocument();
    });
  });

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password');
    const confirmInput = screen.getByTestId('input-confirm-password');
    const submitButton = screen.getByTestId('btn-submit-reset');

    await user.type(passwordInput, 'StrongPass123!');
    await user.type(confirmInput, 'DifferentPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-confirm-password')).toHaveTextContent("Passwords don't match");
    });
  });

  it('should show password strength indicator', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password');

    // Weak password
    await user.type(passwordInput, 'weak');
    await waitFor(() => {
      expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Weak');
    });

    // Clear and type strong password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongP@ss123!');
    await waitFor(() => {
      expect(screen.getByTestId('password-strength-label')).toHaveTextContent('Strong');
    });
  });

  it('should successfully reset password', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);

    // First call for token verification, second for reset
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password reset successful' }),
      } as Response);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password');
    const confirmInput = screen.getByTestId('input-confirm-password');
    const submitButton = screen.getByTestId('btn-submit-reset');

    await user.type(passwordInput, 'NewStrongPass123!');
    await user.type(confirmInput, 'NewStrongPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/password-reset/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'test-token-123',
            newPassword: 'NewStrongPass123!',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('success-state')).toBeInTheDocument();
      expect(screen.getByText('Password Reset Successful!')).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password') as HTMLInputElement;
    const toggleButton = screen.getByTestId('btn-toggle-password');

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should show password requirements checklist', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/One lowercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/One number/)).toBeInTheDocument();
    expect(screen.getByText(/One special character/)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.mocked(fetch);

    // First call for token verification succeeds, second for reset fails
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByTestId('form-reset-password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByTestId('input-new-password');
    const confirmInput = screen.getByTestId('input-confirm-password');
    const submitButton = screen.getByTestId('btn-submit-reset');

    await user.type(passwordInput, 'NewStrongPass123!');
    await user.type(confirmInput, 'NewStrongPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Server error');
    });
  });
});

