/**
 * Scoreboard Component Tests
 *
 * Tests team cards, editable mode, onScoreUpdate, mode variants, non-editable hides edit UI.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { Scoreboard } from '../scoreboard/Scoreboard';
import type { TeamData } from '../scoreboard/Scoreboard';

const defaultHomeTeam: TeamData = {
  name: 'Home Team',
  abbreviation: 'HT',
  score: 42,
  color: '#3B82F6',
};

const defaultAwayTeam: TeamData = {
  name: 'Away Team',
  abbreviation: 'AT',
  score: 38,
  color: '#EF4444',
};

const defaultProps = {
  homeTeam: defaultHomeTeam,
  awayTeam: defaultAwayTeam,
};

describe('Scoreboard', () => {
  describe('rendering', () => {
    it('should render home and away team cards with scores', () => {
      render(<Scoreboard {...defaultProps} />);
      // ScoreCard shows abbreviation when present, else team name
      expect(screen.getByText('HT')).toBeInTheDocument();
      expect(screen.getByText('AT')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });

    it('should show period and time when provided', () => {
      render(<Scoreboard {...defaultProps} period="1st Half" time="23:45" />);
      expect(screen.getByText('1st Half')).toBeInTheDocument();
      expect(screen.getByText('23:45')).toBeInTheDocument();
    });

    it('should have data-testid scoreboard', () => {
      render(<Scoreboard {...defaultProps} data-testid="scoreboard" />);
      expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
    });
  });

  describe('editable mode', () => {
    it('should show edit affordance when editable', async () => {
      render(<Scoreboard {...defaultProps} editable onScoreUpdate={vi.fn()} />);
      const buttons = screen.getAllByTestId('score-card-button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onScoreUpdate with new score when saving', async () => {
      const onScoreUpdate = vi.fn();
      render(<Scoreboard {...defaultProps} editable onScoreUpdate={onScoreUpdate} />);
      const homeCard = screen.getAllByTestId('score-card-button')[0];
      fireEvent.click(homeCard);

      await waitFor(() => {
        expect(screen.getByText('Edit Score')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('42');
      fireEvent.change(input, { target: { value: '50' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(onScoreUpdate).toHaveBeenCalledWith('home', 50);
      });
    });

    it('should not show edit buttons when editable is false', () => {
      render(<Scoreboard {...defaultProps} editable={false} />);
      expect(screen.queryByTestId('score-card-button')).not.toBeInTheDocument();
    });
  });

  describe('mode variants', () => {
    it('should render floating mode', () => {
      render(<Scoreboard {...defaultProps} mode="floating" data-testid="scoreboard" />);
      expect(screen.getByTestId('scoreboard')).toHaveClass('floating');
    });

    it('should render sidebar mode', () => {
      render(<Scoreboard {...defaultProps} mode="sidebar" data-testid="scoreboard" />);
      expect(screen.getByTestId('scoreboard')).toHaveClass('sidebar');
    });

    it('should render minimal mode', () => {
      render(<Scoreboard {...defaultProps} mode="minimal" data-testid="scoreboard" />);
      expect(screen.getByTestId('scoreboard')).toHaveClass('minimal');
    });
  });

  describe('accessibility', () => {
    it('should have role region and aria-label', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.getByRole('region', { name: /scoreboard/i })).toBeInTheDocument();
    });
  });
});
