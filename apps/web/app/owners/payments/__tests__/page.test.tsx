import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    ownerPaymentsConnect: vi.fn(),
    ownerPaymentsAcceptAgreement: vi.fn(),
  },
}));

import { apiClient, type OwnerPaymentsStatus } from '@/lib/api-client';

import OwnerPaymentsPage from '../page';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
  },
});

const status = (over: Partial<OwnerPaymentsStatus> = {}): OwnerPaymentsStatus => ({
  sellerKey: null,
  merchantId: null,
  connected: false,
  connectedAt: null,
  status: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  agreementAccepted: false,
  agreementVersion: null,
  agreementAcceptedAt: null,
  mode: null,
  ...over,
});

const agreed = (over: Partial<OwnerPaymentsStatus> = {}) =>
  status({ sellerKey: 'team-1', agreementAccepted: true, agreementVersion: 'v1', agreementAcceptedAt: '2026-11-07T00:00:00Z', ...over });

function clearOwnerToken() {
  localStorage.removeItem('owner_token');
  localStorage.removeItem('owner_token_expires');
}

beforeEach(() => {
  vi.clearAllMocks();
  clearOwnerToken();
  for (const k of Array.from(searchParams.keys())) searchParams.delete(k);
  localStorage.setItem('owner_token', 't');
  localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
});

describe('OwnerPaymentsPage', () => {
  it('redirects to login when there is no owner token', async () => {
    clearOwnerToken();
    render(<OwnerPaymentsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/owners/login'));
  });

  it('starts on the agreement step and keeps Connect disabled until it is accepted', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(status());
    render(<OwnerPaymentsPage />);

    expect(await screen.findByTestId('step-agreement')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('step-connect')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('link-recipient-agreement')).toHaveAttribute('href', '/legal/recipient-agreement');
    expect(screen.getByTestId('btn-accept-agreement')).toBeDisabled();
    expect(screen.getByTestId('btn-connect-payments')).toBeDisabled();
  });

  it('accepting the agreement records it and moves to the connect step', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValueOnce(status()).mockResolvedValueOnce(agreed());
    vi.mocked(apiClient.ownerPaymentsAcceptAgreement).mockResolvedValue({
      accepted: true,
      version: 'v1',
      acceptedAt: '2026-11-07T00:00:00Z',
      sellerKey: 'team-1',
    });
    render(<OwnerPaymentsPage />);

    await userEvent.click(await screen.findByTestId('checkbox-agree'));
    expect(screen.getByTestId('btn-accept-agreement')).toBeEnabled();
    await userEvent.click(screen.getByTestId('btn-accept-agreement'));

    await waitFor(() => expect(apiClient.ownerPaymentsAcceptAgreement).toHaveBeenCalledWith('t'));
    await waitFor(() => expect(screen.getByTestId('step-connect')).toHaveAttribute('data-active', 'true'));
    expect(screen.getByTestId('step-agreement')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByTestId('btn-connect-payments')).toBeEnabled();
  });

  it('btn-connect-payments starts store onboarding once the agreement is accepted', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(agreed());
    vi.mocked(apiClient.ownerPaymentsConnect).mockResolvedValue({
      onboardingUrl: 'https://store.noctusoft.com/connect/fieldview/onboard?state=abc',
      sellerKey: 'team-1',
    });

    render(<OwnerPaymentsPage />);
    await userEvent.click(await screen.findByTestId('btn-connect-payments'));
    await waitFor(() => expect(apiClient.ownerPaymentsConnect).toHaveBeenCalledWith('t'));
  });

  it('shows Ready when the relay reports the seller connected', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(
      agreed({ connected: true, connectedAt: '2026-11-07T01:00:00Z', status: 'active', chargesEnabled: true, payoutsEnabled: true, merchantId: 'sel_1', mode: 'live' }),
    );
    render(<OwnerPaymentsPage />);

    expect(await screen.findByTestId('status-payments-ready')).toBeInTheDocument();
    expect(screen.getByTestId('btn-connect-payments')).toBeDisabled();
    expect(screen.getByTestId('text-seller-status')).toHaveTextContent(/active/i);
  });

  it('asks a connected coach to accept a newer agreement version, says why, and keeps payouts Ready', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(
      agreed({
        connected: true, connectedAt: '2026-11-07T01:00:00Z', status: 'active', chargesEnabled: true, payoutsEnabled: true, merchantId: 'sel_1', mode: 'live',
        agreementAccepted: false, agreementVersion: 'v1', agreementCurrentVersion: 'v2',
      }),
    );
    render(<OwnerPaymentsPage />);

    expect(await screen.findByTestId('notice-agreement-stale')).toHaveTextContent(/version v1.*version v2/i);
    expect(screen.getByTestId('checkbox-agree')).toBeInTheDocument();
    expect(screen.getByTestId('status-payments-ready')).toBeInTheDocument();
  });

  it('explains a failed return from the provider', async () => {
    searchParams.set('seller', 'failed');
    searchParams.set('code', 'DECLINED');
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(agreed());
    render(<OwnerPaymentsPage />);

    expect(await screen.findByTestId('payments-error')).toHaveTextContent(/DECLINED/);
  });

  it('tells the coach when the provider is still reviewing their details', async () => {
    searchParams.set('payments_connected', 'true');
    searchParams.set('seller', 'pending');
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(agreed({ status: 'pending' }));
    render(<OwnerPaymentsPage />);

    expect(await screen.findByTestId('notice-seller-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('status-payments-ready')).not.toBeInTheDocument();
  });
});
