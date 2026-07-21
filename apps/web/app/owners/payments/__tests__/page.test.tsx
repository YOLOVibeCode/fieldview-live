import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerPaymentsStatus: vi.fn(),
    ownerPaymentsConnect: vi.fn(),
    ownerAcceptAgreement: vi.fn(),
    ownerSetPaymentLocation: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';
import OwnerPaymentsPage from '../page';

// jsdom's localStorage is not fully implemented in this setup; use a Map-backed mock.
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
};

const status = (over: Partial<Status> = {}): Status => ({
  recipientKey: 'owner-1',
  merchantId: null,
  agreementAccepted: true,
  agreementVersion: 'v1',
  connected: false,
  connectedAt: null,
  ...over,
});

function clearOwnerToken() {
  localStorage.removeItem('owner_token');
  localStorage.removeItem('owner_token_expires');
}

beforeEach(() => {
  vi.clearAllMocks();
  clearOwnerToken();
  localStorage.setItem('owner_token', 't');
  localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
});

describe('OwnerPaymentsPage', () => {
  it('redirects to login when there is no owner token', async () => {
    clearOwnerToken();
    render(<OwnerPaymentsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/owners/login'));
  });

  it('shows the agreement step when the agreement is not yet accepted', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status({ agreementAccepted: false }));
    render(<OwnerPaymentsPage />);
    expect(await screen.findByTestId('card-agreement')).toBeInTheDocument();
  });

  it('accepting the agreement calls the API and refetches', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus)
      .mockResolvedValueOnce(status({ agreementAccepted: false }))
      .mockResolvedValueOnce(status({ agreementAccepted: true }));
    vi.mocked(apiClient.ownerAcceptAgreement).mockResolvedValue({ accepted: true, version: 'v1' });

    render(<OwnerPaymentsPage />);
    await userEvent.click(await screen.findByTestId('btn-accept-agreement'));
    await waitFor(() => expect(apiClient.ownerAcceptAgreement).toHaveBeenCalledWith('t', undefined));
  });

  it('the connect step calls ownerPaymentsConnect', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status({ agreementAccepted: true, connected: false }));
    vi.mocked(apiClient.ownerPaymentsConnect).mockResolvedValue({ authorizeUrl: 'https://relay/authz', recipientKey: 'owner-1' });

    render(<OwnerPaymentsPage />);
    await userEvent.click(await screen.findByTestId('btn-connect-payments'));
    await waitFor(() => expect(apiClient.ownerPaymentsConnect).toHaveBeenCalledWith('t'));
  });

  it('the connected state saves the Square location id', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(
      status({ merchantId: 'ML1', connected: true, connectedAt: '2026-07-20T00:00:00Z' }),
    );
    vi.mocked(apiClient.ownerSetPaymentLocation).mockResolvedValue({ locationId: 'LOC1' });

    render(<OwnerPaymentsPage />);
    await userEvent.type(await screen.findByTestId('input-location-id'), 'LOC1');
    await userEvent.click(screen.getByTestId('btn-save-location'));
    await waitFor(() => expect(apiClient.ownerSetPaymentLocation).toHaveBeenCalledWith('t', 'LOC1'));
  });
});
