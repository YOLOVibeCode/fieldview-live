/**
 * Direct Streams page: each game page's link is in plain sight, with a button that copies it.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import OwnerDirectStreamsPage from '../page';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    ownerPaymentsStatus: vi.fn(),
  },
}));

const getPaymentsStatus = vi.mocked(apiClient.ownerPaymentsStatus);
const mockFetch = vi.fn();
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

function gamePage(slug: string, title: string, status = 'active') {
  return {
    id: `id-${slug}`,
    slug,
    title,
    status,
    paywallEnabled: false,
    priceInCents: 0,
    chatEnabled: true,
    scoreboardEnabled: false,
    listed: true,
    createdAt: '2026-11-22T12:00:00.000Z',
  };
}

function listAnswer(streams: ReturnType<typeof gamePage>[]) {
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ streams }) });
}

/** Opens the page and waits for the list it reads as it opens. */
async function renderPage() {
  render(<OwnerDirectStreamsPage />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** jsdom cannot open new tabs; stop it trying when a test clicks a link. */
function blockNavigation(event: Event) {
  event.preventDefault();
}

describe('OwnerDirectStreamsPage links', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    store.clear();
    localStorage.setItem('owner_token', 'owner-jwt');
    localStorage.setItem('owner_token_expires', new Date(Date.now() + 3_600_000).toISOString());
    global.fetch = mockFetch as unknown as typeof fetch;
    getPaymentsStatus.mockRejectedValue(new Error('no payments state in this test'));
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    document.addEventListener('click', blockNavigation, { capture: true });
  });

  afterEach(() => {
    document.removeEventListener('click', blockNavigation, { capture: true });
  });

  it("shows each page's full link, with a button that copies it", async () => {
    listAnswer([gamePage('tigers-vs-hawks', 'Tigers vs Hawks'), gamePage('jv-final', 'JV Final')]);

    await renderPage();

    expect(screen.getByTestId('table-direct-streams')).toBeInTheDocument();
    for (const slug of ['tigers-vs-hawks', 'jv-final']) {
      const row = screen.getByTestId(`row-direct-stream-${slug}`);
      const link = screen.getByTestId(`link-direct-${slug}`);
      expect(row).toContainElement(link);
      expect(link).toHaveAttribute('href', `${window.location.origin}/direct/${slug}`);
      expect(link).toHaveTextContent(`${window.location.host}/direct/${slug}`);
      expect(row).toContainElement(screen.getByTestId(`btn-copy-link-${slug}`));
    }
  });

  it("copies a link without opening the page's settings", async () => {
    listAnswer([gamePage('tigers-vs-hawks', 'Tigers vs Hawks')]);
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-copy-link-tigers-vs-hawks'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/direct/tigers-vs-hawks`);
    expect(screen.getByTestId('btn-copy-link-tigers-vs-hawks')).toHaveTextContent('Copied');
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it("opens the page without opening its settings", async () => {
    listAnswer([gamePage('tigers-vs-hawks', 'Tigers vs Hawks')]);
    await renderPage();

    fireEvent.click(screen.getByTestId('link-direct-tigers-vs-hawks'));

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('still opens the settings when the row itself is clicked', async () => {
    listAnswer([gamePage('tigers-vs-hawks', 'Tigers vs Hawks')]);
    await renderPage();

    fireEvent.click(screen.getByText('Tigers vs Hawks'));

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('offers no copy button for an archived page', async () => {
    listAnswer([gamePage('old-game', 'Old Game', 'archived')]);
    await renderPage();

    expect(screen.getByTestId('link-direct-old-game')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-copy-link-old-game')).not.toBeInTheDocument();
  });
});
