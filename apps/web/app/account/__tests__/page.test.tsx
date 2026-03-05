/**
 * Account Page Tests
 *
 * Tests all 4 sections: Profile, Subscriptions, Payments, Account Actions.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockAuth = vi.fn(() => ({
  viewerIdentityId: 'v-123',
  viewerEmail: 'jane@example.com',
  viewerFirstName: 'Jane',
  viewerLastName: 'Doe',
  viewerName: 'Jane Doe',
  isAuthenticated: true,
  isLoading: false,
  setViewerAuth: vi.fn(),
  clearViewerAuth: vi.fn(),
}));

vi.mock('@/hooks/useGlobalViewerAuth', () => ({
  useGlobalViewerAuth: (...args: unknown[]) => mockAuth(...args),
}));

const mockSubscriptions = [
  { slug: 'tchs-soccer', title: 'TCHS Soccer', scheduledStartAt: '2026-03-01T18:00:00Z', subscribedAt: '2026-02-28T10:00:00Z' },
  { slug: 'basketball', title: 'Basketball Game', scheduledStartAt: null, subscribedAt: '2026-02-27T10:00:00Z' },
];

const mockPurchases = [
  {
    id: 'p-001',
    streamTitle: 'TCHS Soccer',
    streamSlug: 'tchs-soccer',
    streamLink: '/direct/tchs-soccer',
    amountCents: 999,
    currency: 'USD',
    discountCents: 0,
    platformFeeCents: 59,
    status: 'paid',
    paidAt: '2026-02-20T15:00:00Z',
    refundedAt: null,
    cardLastFour: '4242',
    cardBrand: 'Visa',
    refunds: [],
  },
  {
    id: 'p-002',
    streamTitle: 'Basketball Game',
    streamSlug: 'basketball',
    streamLink: '/direct/basketball',
    amountCents: 499,
    currency: 'USD',
    discountCents: 100,
    platformFeeCents: 29,
    status: 'refunded',
    paidAt: '2026-02-15T15:00:00Z',
    refundedAt: '2026-02-16T10:00:00Z',
    cardLastFour: '4242',
    cardBrand: 'Visa',
    refunds: [{ amountCents: 499, reason: 'manual', createdAt: '2026-02-16T10:00:00Z' }],
  },
];

function setupFetch() {
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/subscriptions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscriptions: mockSubscriptions }) });
    }
    if (typeof url === 'string' && url.includes('/purchases')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: mockPurchases }) });
    }
    if (typeof url === 'string' && url.includes('/viewer/') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ updated: true, firstName: 'Janet', lastName: 'Doe' }) });
    }
    if (typeof url === 'string' && url.includes('/notify-me') && opts?.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'unsubscribed' }) });
    }
    if (typeof url === 'string' && url.includes('/viewer-refresh/request')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sent: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }));
}

describe('Account Page', () => {
  beforeEach(() => {
    setupFetch();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('should redirect to home when not authenticated', async () => {
    mockAuth.mockReturnValue({
      viewerIdentityId: null,
      viewerEmail: null,
      viewerFirstName: null,
      viewerLastName: null,
      viewerName: null,
      isAuthenticated: false,
      isLoading: false,
      setViewerAuth: vi.fn(),
      clearViewerAuth: vi.fn(),
    });
    const AccountPage = (await import('../page')).default;
    render(<AccountPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('should show loading spinner when auth is loading', async () => {
    mockAuth.mockReturnValue({
      viewerIdentityId: null,
      viewerEmail: null,
      viewerFirstName: null,
      viewerLastName: null,
      viewerName: null,
      isAuthenticated: false,
      isLoading: true,
      setViewerAuth: vi.fn(),
      clearViewerAuth: vi.fn(),
    });
    const AccountPage = (await import('../page')).default;
    render(<AccountPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show guest message in profile when signed in as guest', async () => {
    mockAuth.mockReturnValue({
      viewerIdentityId: 'v-guest',
      viewerEmail: 'anon-xyz@guest.fieldview.live',
      viewerFirstName: null,
      viewerLastName: null,
      viewerName: 'Guest',
      isAuthenticated: true,
      isLoading: false,
      setViewerAuth: vi.fn(),
      clearViewerAuth: vi.fn(),
    });
    const AccountPage = (await import('../page')).default;
    render(<AccountPage />);
    expect(screen.getByTestId('section-profile')).toBeInTheDocument();
    expect(screen.getByTestId('profile-guest-message')).toBeInTheDocument();
    expect(screen.getByTestId('profile-guest-message')).toHaveTextContent(/signed in as a guest/);
  });

  describe('Profile section', () => {
    it('should show name fields and email', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      expect(screen.getByTestId('section-profile')).toBeInTheDocument();
      expect(screen.getByTestId('input-first-name')).toHaveValue('Jane');
      expect(screen.getByTestId('input-last-name')).toHaveValue('Doe');
      expect(screen.getByTestId('display-email')).toHaveTextContent('jane@example.com');
    });

    it('should show Save button when name is edited and call PATCH on click', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      const user = userEvent.setup();
      const firstNameInput = screen.getByTestId('input-first-name');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Janet');
      expect(screen.getByTestId('btn-save-profile')).toBeInTheDocument();
      await user.click(screen.getByTestId('btn-save-profile'));
      await waitFor(() => expect(screen.getByTestId('profile-saved')).toBeInTheDocument());
    });

    it('should show profile error when PATCH fails', async () => {
      vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/viewer/') && opts?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        if (typeof url === 'string' && url.includes('/subscriptions')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscriptions: [] }) });
        }
        if (typeof url === 'string' && url.includes('/purchases')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: [] }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }));
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      const user = userEvent.setup();
      const firstNameInput = screen.getByTestId('input-first-name');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Janet');
      await user.click(screen.getByTestId('btn-save-profile'));
      await waitFor(() => expect(screen.getByTestId('error-profile')).toBeInTheDocument());
      expect(screen.getByTestId('error-profile')).toHaveTextContent('Server error');
    });
  });

  describe('Subscriptions section', () => {
    it('should show empty state when no subscriptions', async () => {
      vi.stubGlobal('fetch', vi.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/subscriptions')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscriptions: [] }) });
        }
        if (typeof url === 'string' && url.includes('/purchases')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: [] }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }));
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('subs-empty')).toBeInTheDocument());
      expect(screen.getByTestId('subs-empty')).toHaveTextContent(/No active subscriptions/);
    });

    it('should show loading state while subscriptions fetch', async () => {
      const subsPromise = new Promise<Response>((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ subscriptions: [] }),
            } as Response),
          50,
        );
      });
      vi.stubGlobal('fetch', vi.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/subscriptions')) {
          return subsPromise;
        }
        if (typeof url === 'string' && url.includes('/purchases')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: [] }) } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }));
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      expect(screen.getByTestId('subs-loading')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('subs-empty')).toBeInTheDocument(), { timeout: 2000 });
    });

    it('should list subscriptions with stream titles', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('subs-list')).toBeInTheDocument());
      expect(screen.getByTestId('sub-tchs-soccer')).toBeInTheDocument();
      expect(screen.getByTestId('sub-basketball')).toBeInTheDocument();
      expect(screen.getByTestId('link-stream-tchs-soccer')).toHaveTextContent('TCHS Soccer');
    });

    it('should remove subscription on Unsubscribe click', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('btn-unsub-tchs-soccer')).toBeInTheDocument());
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-unsub-tchs-soccer'));
      await waitFor(() => expect(screen.queryByTestId('sub-tchs-soccer')).not.toBeInTheDocument());
    });
  });

  describe('Payment history section', () => {
    it('should show empty state when no purchases', async () => {
      vi.stubGlobal('fetch', vi.fn((url: string) => {
        if (typeof url === 'string' && url.includes('/subscriptions')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscriptions: [] }) });
        }
        if (typeof url === 'string' && url.includes('/purchases')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: [] }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }));
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('payments-empty')).toBeInTheDocument());
      expect(screen.getByTestId('payments-empty')).toHaveTextContent(/No purchases yet/);
    });

    it('should list purchases with amounts and status badges', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('payments-list')).toBeInTheDocument());
      expect(screen.getByTestId('purchase-p-001')).toBeInTheDocument();
      expect(screen.getByTestId('purchase-p-002')).toBeInTheDocument();
      expect(screen.getByTestId('amount-p-001')).toHaveTextContent('$9.99');
      expect(screen.getByTestId('badge-status-paid')).toBeInTheDocument();
      expect(screen.getByTestId('badge-status-refunded')).toBeInTheDocument();
    });

    it('should expand purchase to show receipt detail', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('btn-expand-p-001')).toBeInTheDocument());
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-expand-p-001'));
      await waitFor(() => expect(screen.getByTestId('receipt-p-001')).toBeInTheDocument());
    });

    it('should show refund details in expanded receipt for refunded purchase', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      await waitFor(() => expect(screen.getByTestId('btn-expand-p-002')).toBeInTheDocument());
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-expand-p-002'));
      await waitFor(() => expect(screen.getByTestId('receipt-p-002')).toBeInTheDocument());
      const receipt = screen.getByTestId('receipt-p-002');
      expect(receipt).toHaveTextContent(/Refund/);
      expect(receipt).toHaveTextContent(/manual/);
      expect(receipt).toHaveTextContent(/\$4\.99/);
    });
  });

  describe('Account actions', () => {
    it('should show "Send access link" button and confirm on click', async () => {
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: vi.fn(),
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-send-access-link'));
      await waitFor(() => expect(screen.getByTestId('access-link-sent')).toBeInTheDocument());
    });

    it('should sign out and redirect on Sign out click', async () => {
      const clearMock = vi.fn();
      mockAuth.mockReturnValue({
        viewerIdentityId: 'v-123',
        viewerEmail: 'jane@example.com',
        viewerFirstName: 'Jane',
        viewerLastName: 'Doe',
        viewerName: 'Jane Doe',
        isAuthenticated: true,
        isLoading: false,
        setViewerAuth: vi.fn(),
        clearViewerAuth: clearMock,
      });
      const AccountPage = (await import('../page')).default;
      render(<AccountPage />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('btn-sign-out'));
      expect(clearMock).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
