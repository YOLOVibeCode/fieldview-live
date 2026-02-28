/**
 * CollapsibleScoreboardOverlay Component Tests
 *
 * Tests: returns null when not fullscreen, collapsed vs expanded, onToggle, position, canEditScore.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CollapsibleScoreboardOverlay } from '../CollapsibleScoreboardOverlay';

const mockScoreboard = {
  id: 'sb-1',
  homeTeamName: 'Home',
  awayTeamName: 'Away',
  homeJerseyColor: '#3B82F6',
  awayJerseyColor: '#EF4444',
  homeScore: 2,
  awayScore: 1,
  clockMode: 'stopped' as const,
  clockSeconds: 2700,
  clockStartedAt: null,
  isVisible: true,
  position: 'left',
};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

describe('CollapsibleScoreboardOverlay', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
    vi.stubGlobal('fetch', vi.fn());
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockScoreboard),
    });
  });

  it('should return null when isFullscreen is false', () => {
    const { container } = render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={false}
        onToggle={vi.fn()}
        isFullscreen={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render collapsed MinimalScoreboard when isVisible is false', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={false}
        onToggle={vi.fn()}
        isFullscreen={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('minimal-scoreboard-container')).toBeInTheDocument();
    });
  });

  it('should render expanded overlay when isVisible is true', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={true}
        onToggle={vi.fn()}
        isFullscreen={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('overlay-scoreboard')).toBeInTheDocument();
    });
    expect(screen.getByTestId('scoreboard-drag-handle')).toBeInTheDocument();
    expect(screen.getByTestId('btn-close-scoreboard')).toBeInTheDocument();
  });

  it('should call onToggle when close button clicked', async () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={true}
        onToggle={onToggle}
        isFullscreen={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('btn-close-scoreboard')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-close-scoreboard'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should apply position left class when position is left', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={false}
        onToggle={vi.fn()}
        isFullscreen={true}
        position="left"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('minimal-scoreboard-container')).toHaveClass('left-4');
    });
  });

  it('should apply position right class when position is right', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={false}
        onToggle={vi.fn()}
        isFullscreen={true}
        position="right"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('minimal-scoreboard-container')).toHaveClass('right-4');
    });
  });

  it('should show home and away team names when expanded', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={true}
        onToggle={vi.fn()}
        isFullscreen={true}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('scoreboard-home-team-name')).toHaveTextContent('Home');
      expect(screen.getByTestId('scoreboard-away-team-name')).toHaveTextContent('Away');
    });
  });

  it('should have editable home score button when canEditScore is true', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={true}
        onToggle={vi.fn()}
        isFullscreen={true}
        canEditScore={true}
      />,
    );
    await waitFor(() => {
      const homeScoreBtn = screen.getByTestId('scoreboard-home-score');
      expect(homeScoreBtn).not.toBeDisabled();
    });
  });

  it('should have non-editable home score when canEditScore is false', async () => {
    render(
      <CollapsibleScoreboardOverlay
        slug="test"
        isVisible={true}
        onToggle={vi.fn()}
        isFullscreen={true}
        canEditScore={false}
      />,
    );
    await waitFor(() => {
      const homeScoreBtn = screen.getByTestId('scoreboard-home-score');
      expect(homeScoreBtn).toBeDisabled();
    });
  });
});
