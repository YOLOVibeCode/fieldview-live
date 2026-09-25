import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
  },
}));

import { apiClient } from '@/lib/api-client';
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

type Status = {
  sellerKey: string | null;
  merchantId: string | null;
  connected: boolean;
  connectedAt: string | null;
};

const status = (over: Partial<Status> = {}): Status => ({
  sellerKey: null,
  merchantId: null,
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
  searchParams.delete('payments_connected');
  localStorage.setItem('owner_token', 't');
  localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
});

describe('OwnerPaymentsPage', () => {
  it('redirects to login when there is no owner token', async () => {
    clearOwnerToken();
    render(<OwnerPaymentsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/owners/login'));
  });

  it('shows connect step when seller onboarding is not complete', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(
      status({ sellerKey: 'team-1', connected: false }),
    );
    render(<OwnerPaymentsPage />);
    expect(await screen.findByTestId('step-connect')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('btn-connect-payments')).toBeInTheDocument();
  });

  it('btn-connect-payments starts store onboarding', async () => {
    vi.mocked(apiClient.ownerPaymentsStatus).mockResolvedValue(
      status({ sellerKey: 'team-1', connected: false }),
    );
    vi.mocked(apiClient.ownerPaymentsConnect).mockResolvedValue({
      onboardingUrl: 'https://store.noctusoft.com/onboard/team-1',
      sellerKey: 'team-1',
    });

    render(<OwnerPaymentsPage />);
    await userEvent.click(await screen.findByTestId('btn-connect-payments'));
    await waitFor(() => expect(apiClient.ownerPaymentsConnect).toHaveBeenCalledWith('t'));
  });
});
