/**
 * Owner dashboard: the text commands card shows only to an account that has the feature.
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import OwnerDashboardPage from '../page';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerPaymentsStatus: vi.fn(),
    ownerLedger: vi.fn(),
    ownerTextCommands: vi.fn(),
  },
}));

const getPaymentsStatus = vi.mocked(apiClient.ownerPaymentsStatus);
const getLedger = vi.mocked(apiClient.ownerLedger);
const getTextCommands = vi.mocked(apiClient.ownerTextCommands);

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

function textCommands(enabled: boolean) {
  return {
    enabled,
    state: 'none',
    productNumber: '+18773435308',
    phoneMasked: null,
    pendingPhoneMasked: null,
    codeExpiresAt: null,
    unverifiedTextSeen: false,
    verifiedAt: null,
    lastCommandAt: null,
    timeZone: 'America/Chicago',
    commands: [],
  } as Awaited<ReturnType<typeof apiClient.ownerTextCommands>>;
}

/** Opens the dashboard and waits for everything it reads as it opens. */
async function renderDashboard() {
  render(<OwnerDashboardPage />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('OwnerDashboardPage text commands card', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    store.clear();
    localStorage.setItem('owner_token', 'owner-jwt');
    localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
    getPaymentsStatus.mockRejectedValue(new Error('no payments state in this test'));
    getLedger.mockResolvedValue({
      totals: { grossCents: 0, platformFeeCents: 0, ownerNetCents: 0 },
    } as Awaited<ReturnType<typeof apiClient.ownerLedger>>);
  });

  it('shows the card, with a way in, to an account that has text commands', async () => {
    getTextCommands.mockResolvedValue(textCommands(true));

    await renderDashboard();

    expect(getTextCommands).toHaveBeenCalledTimes(1);
    expect(getTextCommands).toHaveBeenCalledWith('owner-jwt');
    const card = screen.getByTestId('card-text-commands');
    expect(card).toHaveTextContent('Text commands');
    expect(card).toHaveTextContent('Run game day from your phone');
    const link = screen.getByTestId('link-text-commands');
    expect(card).toContainElement(link);
    expect(link).toHaveAttribute('href', '/owners/text-commands');
    expect(link).toHaveTextContent('Manage text commands');
  });

  it('puts the card after the streaming providers card', async () => {
    getTextCommands.mockResolvedValue(textCommands(true));

    await renderDashboard();

    const cards = Array.from(document.querySelectorAll('[data-testid^="card-"]')).map((card) =>
      card.getAttribute('data-testid')
    );
    expect(cards.indexOf('card-text-commands')).toBe(cards.indexOf('card-camera-sources') + 1);
  });

  it('shows the card whatever the state of the link', async () => {
    getTextCommands.mockResolvedValue({ ...textCommands(true), state: 'linked' });

    await renderDashboard();

    expect(screen.getByTestId('card-text-commands')).toBeInTheDocument();
  });

  it('hides the card when the feature is off for the account', async () => {
    getTextCommands.mockResolvedValue(textCommands(false));

    await renderDashboard();

    expect(getTextCommands).toHaveBeenCalledTimes(1);
    // The earnings card has settled, so the page has heard back from everything it asked.
    expect(screen.getByTestId('empty-earnings')).toBeInTheDocument();
    expect(screen.getByTestId('card-camera-sources')).toBeInTheDocument();
    expect(screen.queryByTestId('card-text-commands')).not.toBeInTheDocument();
    expect(screen.queryByTestId('link-text-commands')).not.toBeInTheDocument();
  });

  it('hides the card, and keeps the rest of the dashboard, when the state cannot be read', async () => {
    getTextCommands.mockRejectedValue(new Error('API is down'));

    await renderDashboard();

    expect(getTextCommands).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('empty-earnings')).toBeInTheDocument();
    expect(screen.getByTestId('card-games')).toBeInTheDocument();
    expect(screen.getByTestId('card-camera-sources')).toBeInTheDocument();
    expect(screen.getByTestId('card-earnings')).toBeInTheDocument();
    expect(screen.queryByTestId('card-text-commands')).not.toBeInTheDocument();
  });

  it('does not show the card before the answer arrives', async () => {
    getTextCommands.mockReturnValue(new Promise(() => {}));

    await renderDashboard();

    expect(getTextCommands).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('card-camera-sources')).toBeInTheDocument();
    expect(screen.queryByTestId('card-text-commands')).not.toBeInTheDocument();
  });

  it('asks nothing when the owner is not signed in', async () => {
    store.clear();

    await renderDashboard();

    expect(replace).toHaveBeenCalledWith('/owners/login');
    expect(getTextCommands).not.toHaveBeenCalled();
    expect(screen.queryByTestId('card-text-commands')).not.toBeInTheDocument();
  });
});
