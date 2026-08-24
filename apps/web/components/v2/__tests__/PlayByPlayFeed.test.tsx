import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayByPlayFeed } from '../plays/PlayByPlayFeed';
import type { GameEventPayload } from '@fieldview/data-model';

function makeEvent(overrides: Partial<GameEventPayload> = {}): GameEventPayload {
  return {
    id: 'evt-1',
    sportId: 'football',
    eventTypeId: 'touchdown',
    label: 'Touchdown',
    icon: 'zap',
    category: 'scoring',
    team: 'home',
    status: 'confirmed',
    confirmationCount: 3,
    confirmationNeeded: 3,
    pointsDelta: 6,
    displayName: 'Alice A.',
    reportedByViewerId: 'v-a',
    chatMessageId: null,
    createdAt: new Date('2026-08-21T01:00:00Z').toISOString(),
    narration: 'Touchdown — Eagles, #12 — 18-yd run',
    periodLabel: 'Q1',
    clockSeconds: 420,
    jerseyNumber: 12,
    detail: 'run',
    detailValue: 18,
    note: null,
    filmTimeSeconds: 305,
    ...overrides,
  };
}

describe('PlayByPlayFeed', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ events: [makeEvent()] }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows loading state initially', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})) // never resolves
    );
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    expect(screen.getByTestId('plays-loading')).toBeInTheDocument();
  });

  it('renders confirmed plays grouped by period', async () => {
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => expect(screen.getByTestId('plays-feed')).toBeInTheDocument());
    expect(screen.getByTestId('plays-group-Q1')).toBeInTheDocument();
    expect(screen.getByTestId('play-row-evt-1')).toBeInTheDocument();
  });

  it('displays narration when present', async () => {
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('play-narration-evt-1'));
    expect(screen.getByTestId('play-narration-evt-1')).toHaveTextContent(
      'Touchdown — Eagles, #12 — 18-yd run'
    );
  });

  it('falls back to label when no narration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ events: [makeEvent({ narration: undefined })] }),
      })
    );
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('play-narration-evt-1'));
    expect(screen.getByTestId('play-narration-evt-1')).toHaveTextContent('Touchdown');
  });

  it('renders confirmed status badge for confirmed events', async () => {
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('plays-feed'));
    const badge = screen.getByTestId('play-status-evt-1');
    expect(badge.textContent).toContain('✓');
  });

  it('shows empty state when no plays', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ events: [] }),
      })
    );
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => expect(screen.getByTestId('plays-empty')).toBeInTheDocument());
  });

  it('groups plays by different periods', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            events: [
              makeEvent({ id: 'evt-1', periodLabel: 'Q1' }),
              makeEvent({ id: 'evt-2', periodLabel: 'Q2', narration: 'Touchdown — Hawks' }),
            ],
          }),
      })
    );
    render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('plays-feed'));
    expect(screen.getByTestId('plays-group-Q1')).toBeInTheDocument();
    expect(screen.getByTestId('plays-group-Q2')).toBeInTheDocument();
  });

  it('merges a live confirmed event from latestEvent prop', async () => {
    const { rerender } = render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('plays-feed'));

    const newEvent = makeEvent({
      id: 'evt-live',
      narration: 'Field Goal — Eagles — 42-yd',
      periodLabel: 'Q2',
    });

    rerender(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
        latestEvent={newEvent}
      />
    );

    await waitFor(() => screen.getByTestId('play-row-evt-live'));
    expect(screen.getByTestId('play-narration-evt-live')).toHaveTextContent(
      'Field Goal — Eagles — 42-yd'
    );
  });

  it('filters out hype events from latestEvent', async () => {
    const { rerender } = render(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
      />
    );
    await waitFor(() => screen.getByTestId('plays-feed'));

    const hypeEvent = makeEvent({
      id: 'evt-hype',
      category: 'hype',
      eventTypeId: 'big_play',
      label: 'Big Play',
      narration: 'Big Play',
    });

    rerender(
      <PlayByPlayFeed
        slug="tchs"
        sportId="football"
        homeTeamName="Eagles"
        awayTeamName="Hawks"
        latestEvent={hypeEvent}
      />
    );

    expect(screen.queryByTestId('play-row-evt-hype')).not.toBeInTheDocument();
  });
});
