/**
 * Owner dashboard: the coach's game pages and their links come first; the text commands
 * card shows only to an account that has the feature.
 */

import type { CoachTextPhoneStatus, CoachTextStatus } from '@fieldview/data-model';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, type OwnerDirectStreamSummary } from '@/lib/api-client';

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
    ownerDirectStreams: vi.fn(),
  },
}));

const getPaymentsStatus = vi.mocked(apiClient.ownerPaymentsStatus);
const getLedger = vi.mocked(apiClient.ownerLedger);
const getTextCommands = vi.mocked(apiClient.ownerTextCommands);
const getDirectStreams = vi.mocked(apiClient.ownerDirectStreams);
const writeText = vi.fn<[string], Promise<void>>();

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

function textCommands(enabled: boolean, phones: CoachTextPhoneStatus[] = []): CoachTextStatus {
  return {
    enabled,
    productNumber: '+18773435308',
    timeZone: 'America/Chicago',
    maxPhones: 10,
    phones,
    commands: [],
  };
}

const LINKED_PHONE: CoachTextPhoneStatus = {
  id: '7d4f2b1e-8c3a-4e5f-9b6d-1a2c3e4f5a6b',
  label: 'Jordan',
  phoneMasked: '(***) ***-0142',
  state: 'linked',
  codeExpiresAt: null,
  verifiedAt: '2026-11-20T15:30:00.000Z',
  lastCommandAt: null,
  unverifiedTextSeen: false,
};

function gamePage(slug: string, title: string): OwnerDirectStreamSummary {
  return {
    id: `id-${slug}`,
    slug,
    title,
    status: 'active',
    streamUrl: null,
    scheduledStartAt: null,
    paywallEnabled: false,
    priceInCents: 0,
    chatEnabled: true,
    scoreboardEnabled: false,
    listed: true,
    createdAt: '2026-11-22T12:00:00.000Z',
  };
}

/** jsdom cannot open new tabs; stop it trying when a test clicks a link. */
function blockNavigation(event: Event) {
  event.preventDefault();
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
    getDirectStreams.mockResolvedValue({ streams: [] });
  });

  it('shows the card, with a way in, to an account that has text commands', async () => {
    getTextCommands.mockResolvedValue(textCommands(true));

    await renderDashboard();

    expect(getTextCommands).toHaveBeenCalledTimes(1);
    expect(getTextCommands).toHaveBeenCalledWith('owner-jwt');
    const card = screen.getByTestId('card-text-commands');
    expect(card).toHaveTextContent('Text commands');
    expect(card).toHaveTextContent('Run game day from your phones.');
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

  it('shows the card whatever phones the account has', async () => {
    getTextCommands.mockResolvedValue(textCommands(true, [LINKED_PHONE]));

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

describe('OwnerDashboardPage direct streams card', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    store.clear();
    localStorage.setItem('owner_token', 'owner-jwt');
    localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
    getPaymentsStatus.mockRejectedValue(new Error('no payments state in this test'));
    getLedger.mockResolvedValue({
      totals: { grossCents: 0, platformFeeCents: 0, ownerNetCents: 0 },
    } as Awaited<ReturnType<typeof apiClient.ownerLedger>>);
    getTextCommands.mockResolvedValue(textCommands(false));
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    document.addEventListener('click', blockNavigation, { capture: true });
  });

  afterEach(() => {
    document.removeEventListener('click', blockNavigation, { capture: true });
  });

  it('comes first, with each game page and the link to share', async () => {
    getDirectStreams.mockResolvedValue({
      streams: [gamePage('tigers-vs-hawks', 'Tigers vs Hawks'), gamePage('jv-final', 'JV Final')],
    });

    await renderDashboard();

    expect(getDirectStreams).toHaveBeenCalledTimes(1);
    expect(getDirectStreams).toHaveBeenCalledWith('owner-jwt');
    const cards = Array.from(document.querySelectorAll('[data-testid^="card-"]')).map((card) =>
      card.getAttribute('data-testid')
    );
    expect(cards[0]).toBe('card-direct-streams');
    const card = screen.getByTestId('card-direct-streams');
    expect(card).toHaveTextContent('Direct Streams');
    for (const [slug, title] of [
      ['tigers-vs-hawks', 'Tigers vs Hawks'],
      ['jv-final', 'JV Final'],
    ] as const) {
      const row = screen.getByTestId(`row-direct-link-${slug}`);
      expect(card).toContainElement(row);
      expect(row).toHaveTextContent(title);
      const link = screen.getByTestId(`link-direct-${slug}`);
      expect(row).toContainElement(link);
      expect(link).toHaveAttribute('href', `${window.location.origin}/direct/${slug}`);
      expect(row).toContainElement(screen.getByTestId(`btn-copy-link-${slug}`));
    }
    const manage = screen.getByTestId('link-direct-streams');
    expect(card).toContainElement(manage);
    expect(manage).toHaveAttribute('href', '/owners/direct-streams');
    expect(manage).toHaveTextContent('Manage direct streams');
  });

  it("copies a page's link", async () => {
    getDirectStreams.mockResolvedValue({ streams: [gamePage('tigers-vs-hawks', 'Tigers vs Hawks')] });
    await renderDashboard();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-copy-link-tigers-vs-hawks'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/direct/tigers-vs-hawks`);
    expect(screen.getByTestId('btn-copy-link-tigers-vs-hawks')).toHaveTextContent('Copied');
  });

  it('shows the five newest pages and says how many more there are', async () => {
    const pages = Array.from({ length: 7 }, (_, i) => gamePage(`game-${i + 1}`, `Game ${i + 1}`));
    getDirectStreams.mockResolvedValue({ streams: pages });

    await renderDashboard();

    expect(screen.getAllByTestId(/^row-direct-link-/)).toHaveLength(5);
    expect(screen.getByTestId('row-direct-link-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-direct-link-game-5')).toBeInTheDocument();
    expect(screen.queryByTestId('row-direct-link-game-6')).not.toBeInTheDocument();
    expect(screen.getByTestId('text-more-direct-streams')).toHaveTextContent('2 more on the Direct Streams page');
  });

  it('says nothing about more pages when all of them fit', async () => {
    getDirectStreams.mockResolvedValue({ streams: [gamePage('tigers-vs-hawks', 'Tigers vs Hawks')] });

    await renderDashboard();

    expect(screen.queryByTestId('text-more-direct-streams')).not.toBeInTheDocument();
  });

  it('invites a coach with no pages to make one', async () => {
    getDirectStreams.mockResolvedValue({ streams: [] });

    await renderDashboard();

    expect(screen.getByTestId('empty-direct-streams')).toHaveTextContent('No game pages yet');
    const create = screen.getByTestId('link-direct-streams');
    expect(create).toHaveAttribute('href', '/owners/direct-streams');
    expect(create).toHaveTextContent('Create a game page');
    expect(screen.queryByTestId(/^row-direct-link-/)).not.toBeInTheDocument();
  });

  it('keeps the way in, and the rest of the dashboard, when the pages cannot be read', async () => {
    getDirectStreams.mockRejectedValue(new Error('API is down'));

    await renderDashboard();

    expect(screen.getByTestId('error-direct-streams')).toHaveTextContent('could not be loaded');
    expect(screen.getByTestId('link-direct-streams')).toHaveAttribute('href', '/owners/direct-streams');
    expect(screen.queryByTestId('empty-direct-streams')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-games')).toBeInTheDocument();
    expect(screen.getByTestId('card-earnings')).toBeInTheDocument();
  });

  it('says it is loading until the pages arrive', async () => {
    getDirectStreams.mockReturnValue(new Promise(() => {}));

    await renderDashboard();

    expect(screen.getByTestId('loading-direct-streams')).toBeInTheDocument();
    expect(screen.getByTestId('link-direct-streams')).toHaveTextContent('Manage direct streams');
    expect(screen.queryByTestId('empty-direct-streams')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-direct-streams')).not.toBeInTheDocument();
  });

  it('asks nothing when the owner is not signed in', async () => {
    store.clear();

    await renderDashboard();

    expect(replace).toHaveBeenCalledWith('/owners/login');
    expect(getDirectStreams).not.toHaveBeenCalled();
  });
});
