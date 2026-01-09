/**
 * TDD Unit Tests: CollapsibleScoreboardOverlay Component
 * Following the architect's recommendations for comprehensive test coverage
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollapsibleScoreboardOverlay, type GameScoreboard } from '@/components/CollapsibleScoreboardOverlay';

// Mock fetch globally
global.fetch = vi.fn();

const mockScoreboard: GameScoreboard = {
  id: 'test-scoreboard-1',
  homeTeamName: 'Home Team',
  awayTeamName: 'Away Team',
  homeJerseyColor: '#003366',
  awayJerseyColor: '#CC0000',
  homeScore: 3,
  awayScore: 2,
  clockMode: 'stopped',
  clockSeconds: 300,
  clockStartedAt: null,
  isVisible: true,
  position: 'top-left',
};

describe('CollapsibleScoreboardOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock successful API response by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockScoreboard,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering Conditions', () => {
    it('renders null when not in fullscreen mode', () => {
      const { container } = render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders null when scoreboard is not visible', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockScoreboard, isVisible: false }),
      });

      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      // Wait for API call
      await vi.advanceTimersByTimeAsync(100);

      expect(screen.queryByTestId('btn-toggle-scoreboard')).not.toBeInTheDocument();
    });

    it('renders collapsed button when in fullscreen and not visible', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('btn-toggle-scoreboard')).toBeInTheDocument();
    });
  });

  describe('Collapsed Button', () => {
    it('displays current score badge', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const badge = screen.getByTestId('scoreboard-score-badge');
      expect(badge).toHaveTextContent('3-2');
    });

    it('positions button on left when position="left"', async () => {
      const { container } = render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      expect(button).toHaveClass('left-4');
    });

    it('positions button on right when position="right"', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="right"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      expect(button).toHaveClass('right-4');
    });

    it('calls onToggle when button is clicked', async () => {
      const onToggle = vi.fn();

      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={onToggle}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      fireEvent.click(button);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('has proper aria-label for accessibility', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      expect(button).toHaveAttribute('aria-label', 'Toggle scoreboard overlay');
    });
  });

  describe('Expanded Sidebar', () => {
    it('renders expanded overlay when isVisible is true', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('overlay-scoreboard')).toBeInTheDocument();
    });

    it('displays home team card with correct data', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('scoreboard-home-team-name')).toHaveTextContent('Home Team');
      expect(screen.getByTestId('scoreboard-home-score')).toHaveTextContent('3');
    });

    it('displays away team card with correct data', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('scoreboard-away-team-name')).toHaveTextContent('Away Team');
      expect(screen.getByTestId('scoreboard-away-score')).toHaveTextContent('2');
    });

    it('displays clock with formatted time', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const clock = screen.getByTestId('scoreboard-clock');
      expect(clock).toHaveTextContent('5:00'); // 300 seconds = 5:00
    });

    it('calls onToggle when close button is clicked', async () => {
      const onToggle = vi.fn();

      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={onToggle}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const closeButton = screen.getByTestId('btn-close-scoreboard');
      fireEvent.click(closeButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('has proper ARIA attributes for accessibility', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const overlay = screen.getByTestId('overlay-scoreboard');
      expect(overlay).toHaveAttribute('role', 'region');
      expect(overlay).toHaveAttribute('aria-label', 'Game scoreboard');
    });
  });

  describe('API Integration', () => {
    it('fetches scoreboard data on mount', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/direct/tchs/scoreboard')
      );
    });

    it('polls scoreboard API every 2 seconds', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      // Initial fetch
      await vi.advanceTimersByTimeAsync(100);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // After 2 seconds
      await vi.advanceTimersByTimeAsync(2000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // After 4 seconds
      await vi.advanceTimersByTimeAsync(2000);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      // Should not crash, should render nothing
      expect(container.firstChild).toBeNull();
    });

    it('handles 404 response gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { container } = render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Clock Updates', () => {
    it('updates clock in real-time when running', async () => {
      const runningScoreboard: GameScoreboard = {
        ...mockScoreboard,
        clockMode: 'running',
        clockStartedAt: new Date().toISOString(),
        clockSeconds: 0,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => runningScoreboard,
      });

      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const clockBefore = screen.getByTestId('scoreboard-clock').textContent;

      // Advance by 1 second (clock updates every 100ms)
      await vi.advanceTimersByTimeAsync(1000);

      const clockAfter = screen.getByTestId('scoreboard-clock').textContent;

      // Clock should have advanced
      expect(clockBefore).not.toBe(clockAfter);
    });

    it('shows running indicator when clock is running', async () => {
      const runningScoreboard: GameScoreboard = {
        ...mockScoreboard,
        clockMode: 'running',
        clockStartedAt: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => runningScoreboard,
      });

      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('scoreboard-clock-indicator')).toBeInTheDocument();
    });

    it('does not show running indicator when clock is stopped', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.queryByTestId('scoreboard-clock-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('applies mobile-responsive width classes', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const overlay = screen.getByTestId('overlay-scoreboard');
      expect(overlay).toHaveClass('w-full', 'sm:w-80', 'md:w-96');
    });

    it('positions at bottom on mobile', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      expect(button).toHaveClass('bottom-4');
    });
  });

  describe('Score Badge Updates', () => {
    it('updates badge when score changes', async () => {
      const { rerender } = render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId('scoreboard-score-badge')).toHaveTextContent('3-2');

      // Update mock to return new score
      const updatedScoreboard: GameScoreboard = {
        ...mockScoreboard,
        homeScore: 5,
        awayScore: 4,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedScoreboard,
      });

      // Trigger poll
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByTestId('scoreboard-score-badge')).toHaveTextContent('5-4');
      });
    });
  });

  describe('Theme Compliance', () => {
    it('applies cinema theme classes', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={false}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const button = screen.getByTestId('btn-toggle-scoreboard');
      expect(button).toHaveClass('bg-accent/90', 'backdrop-blur-md');
    });

    it('applies translucent gradient background to expanded overlay', async () => {
      render(
        <CollapsibleScoreboardOverlay
          slug="tchs"
          isVisible={true}
          onToggle={vi.fn()}
          position="left"
          isFullscreen={true}
        />
      );

      await vi.advanceTimersByTimeAsync(100);

      const overlay = screen.getByTestId('overlay-scoreboard');
      const gradient = overlay.querySelector('.bg-gradient-to-b');
      
      expect(gradient).toBeInTheDocument();
    });
  });
});

