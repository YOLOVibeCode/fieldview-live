import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
const searchParams = new URLSearchParams('');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerPaymentsStatus: vi.fn(),
    ownerLedger: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';
import OwnerDashboardPage from '../page';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

type Status = {
  recipientKey: string | null;
  merchantId: string | null;
  agreementAccepted: boolean;
  agreementVersion: string | null;
  connected: boolean;
  connectedAt: string | null;
  locationId: string | null;
};

const status = (over: Partial<Status> = {}): Status => ({
  recipientKey: 'owner-1',
  merchantId: null,
  agreementAccepted: false,
  agreementVersion: null,
  connected: false,
  connectedAt: null,
  locationId: null,
  ...over,
});

const emptyTotals = {
  grossCents: 0,
  platformFeeCents: 0,
  processorFeeCents: 0,
  ownerNetCents: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.delete('payments_connected');
  localStorage.setItem('owner_token', 't');
  localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
  vi.mocked(apiClient.ownerLedger).mockResolvedValue({ entries: [], purchases: [], totals: emptyTotals });
});

describe('OwnerDashboardPage', () => {
  it('does not render the legacy Square card', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status());
    render(<OwnerDashboardPage />);
    await waitFor(() => expect(screen.getByTestId('card-payments')).toBeInTheDocument());
    expect(screen.queryByTestId('card-square')).not.toBeInTheDocument();
    expect(screen.queryByTestId('link-square-connect')).not.toBeInTheDocument();
  });

  it.each([
    ['Not started', status()],
    ['Agreement needed', status({ connected: true })],
    ['Connect Square', status({ agreementAccepted: true })],
    ['Add location', status({ agreementAccepted: true, connected: true })],
    ['Ready', status({ agreementAccepted: true, connected: true, locationId: 'LOC1' })],
  ])('shows badge "%s" for the matching status', async (label, mockStatus) => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(mockStatus);
    render(<OwnerDashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('status-payments-badge')).toHaveTextContent(label);
    });
  });

  it('shows success toast when payments_connected=true', async () => {
    searchParams.set('payments_connected', 'true');
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status({ connected: true, merchantId: 'ML1' }));

    render(<OwnerDashboardPage />);
    expect(await screen.findByTestId('toast-payments-connected')).toHaveTextContent('Square account connected');
  });

  it('links to the payments page', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status());
    render(<OwnerDashboardPage />);
    expect(await screen.findByTestId('link-payments')).toHaveAttribute('href', '/owners/payments');
  });

  it('shows empty earnings state when there are no paid purchases', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status());
    render(<OwnerDashboardPage />);
    expect(await screen.findByTestId('empty-earnings')).toHaveTextContent('No paid purchases yet');
  });

  it('shows gross, platform fee, and payout when earnings exist', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status());
    vi.mocked(apiClient.ownerLedger).mockResolvedValue({
      entries: [],
      purchases: [
        {
          purchaseId: 'p1',
          grossCents: 1000,
          platformFeeCents: 100,
          processorFeeCents: 59,
          ownerNetCents: 841,
        },
      ],
      totals: {
        grossCents: 1000,
        platformFeeCents: 100,
        processorFeeCents: 59,
        ownerNetCents: 841,
      },
    });

    render(<OwnerDashboardPage />);

    expect(await screen.findByTestId('earnings-gross')).toHaveTextContent('$10.00');
    expect(screen.getByTestId('earnings-platform-fee')).toHaveTextContent('$1.00');
    expect(screen.getByTestId('earnings-net')).toHaveTextContent('$8.41');
  });
});
