/**
 * AdminPanel Component Tests
 *
 * Tests unlock flow, settings form visibility, toggles, broadcast input, save API.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminPanel } from '../AdminPanel';

describe('AdminPanel', () => {
  const defaultProps = {
    slug: 'test-stream',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('console', { log: vi.fn(), error: vi.fn(), warn: vi.fn() });
    // AdminPanel reads localStorage.getItem('owner_token') for auto-unlock
    const storageMock: Storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn().mockReturnValue(null),
    };
    Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });
  });

  describe('unlock flow', () => {
    it('should render password input when locked', () => {
      render(<AdminPanel {...defaultProps} />);
      expect(screen.getByTestId('admin-panel-unlock')).toBeInTheDocument();
      expect(screen.getByTestId('admin-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('admin-unlock-form')).toBeInTheDocument();
      expect(screen.getByTestId('unlock-admin-button')).toBeInTheDocument();
    });

    it('should show error when unlock fails', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'Invalid password' } }),
      });
      render(<AdminPanel {...defaultProps} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'wrong' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('unlock-error-message')).toHaveTextContent(/invalid password/i);
      });
    });

    it('should show settings form when unlock succeeds', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt-token-123' }),
      });
      render(<AdminPanel {...defaultProps} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel-settings')).toBeInTheDocument();
      });
      expect(screen.getByTestId('stream-url-input')).toBeInTheDocument();
      expect(screen.getByTestId('save-settings-button')).toBeInTheDocument();
    });

    it('unlocks hierarchical event slugs against the parent slug', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt-token-123' }),
      });
      render(
        <AdminPanel slug="dentondiablos/soccer-2008-20260325" />
      );
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'devil2026' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel-settings')).toBeInTheDocument();
      });
      const fetchMock = fetch as ReturnType<typeof vi.fn>;
      const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? '');
      expect(calledUrl).toContain('/api/direct/dentondiablos/unlock-admin');
      expect(calledUrl).not.toContain('soccer-2008');
    });

    it('should call onAuthSuccess with token when unlock succeeds', async () => {
      const onAuthSuccess = vi.fn();
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt-token-123' }),
      });
      render(<AdminPanel {...defaultProps} onAuthSuccess={onAuthSuccess} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel-settings')).toBeInTheDocument();
      });
      expect(onAuthSuccess).toHaveBeenCalledWith('jwt-token-123', undefined);
    });
  });

  describe('settings form', () => {
    it('should show broadcast message input when unlocked', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt-token-123' }),
      });
      render(<AdminPanel {...defaultProps} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('input-broadcast-message')).toBeInTheDocument();
      });
    });

    it('should show chat enabled and paywall toggles when unlocked', async () => {
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'jwt' }) })
        .mockResolvedValue({ ok: true });
      render(<AdminPanel {...defaultProps} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('chat-enabled-checkbox')).toBeInTheDocument();
        expect(screen.getByTestId('paywall-enabled-checkbox')).toBeInTheDocument();
      });
    });
  });
});
