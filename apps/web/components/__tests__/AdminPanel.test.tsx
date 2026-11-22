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

    it('fills the stream URL from the one stream that is live on the streaming provider', async () => {
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'jwt-token-123' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              streams: [
                {
                  provider: 'veo',
                  providerName: 'Veo',
                  title: 'Diablos vs Storm',
                  streamUrl: 'https://stream.mux.com/LIVE1.m3u8',
                },
              ],
              sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }],
            }),
        });
      render(<AdminPanel {...defaultProps} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('btn-find-live-stream')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-find-live-stream'));

      await waitFor(() => {
        expect(screen.getByTestId('stream-url-input')).toHaveValue('https://stream.mux.com/LIVE1.m3u8');
      });
      // Finding a stream only fills the field; nothing is saved until the admin presses Save.
      expect(fetch).toHaveBeenCalledTimes(2);
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

  // Price and paywall decide what viewers pay the owner: only the owner's own
  // login may change them. The page password still runs everything else.
  describe('price and paywall', () => {
    const paidSettings = { paywallEnabled: true, priceInCents: 500 };

    it('locks price and paywall after a password unlock and points to the owner portal', async () => {
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'jwt', canEditPayments: false }),
        })
        .mockResolvedValue({ ok: true });
      render(<AdminPanel {...defaultProps} initialSettings={paidSettings} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));

      await waitFor(() => {
        expect(screen.getByTestId('paywall-enabled-checkbox')).toBeDisabled();
      });
      expect(screen.getByTestId('paywall-price-input')).toBeDisabled();
      expect(screen.getByTestId('note-payments-owner-only')).toBeInTheDocument();
      expect(screen.getByTestId('link-owner-portal-payments')).toHaveAttribute('href', '/owners/direct-streams');
    });

    it("keeps price and paywall editable after the owner's own login unlocks the panel", async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('owner-login-token');
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'jwt', canEditPayments: true }),
        })
        .mockResolvedValue({ ok: true });
      render(<AdminPanel {...defaultProps} initialSettings={paidSettings} />);

      await waitFor(() => {
        expect(screen.getByTestId('paywall-enabled-checkbox')).not.toBeDisabled();
      });
      expect(screen.getByTestId('paywall-price-input')).not.toBeDisabled();
      expect(screen.queryByTestId('note-payments-owner-only')).not.toBeInTheDocument();
    });

    it('leaves price and paywall out of the save after a password unlock', async () => {
      const fetchMock = fetch as ReturnType<typeof vi.fn>;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'jwt', canEditPayments: false }),
        })
        .mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
      render(<AdminPanel {...defaultProps} initialSettings={paidSettings} />);
      fireEvent.change(screen.getByTestId('admin-password-input'), { target: { value: 'correct' } });
      fireEvent.submit(screen.getByTestId('admin-unlock-form'));
      await waitFor(() => {
        expect(screen.getByTestId('save-settings-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('save-settings-button'));

      await waitFor(() => {
        const saveCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/settings'));
        expect(saveCall).toBeDefined();
        const body = JSON.parse(String((saveCall?.[1] as RequestInit | undefined)?.body)) as Record<string, unknown>;
        expect(body).not.toHaveProperty('paywallEnabled');
        expect(body).not.toHaveProperty('priceInCents');
        expect(body).toHaveProperty('chatEnabled');
      });
    });
  });
});
