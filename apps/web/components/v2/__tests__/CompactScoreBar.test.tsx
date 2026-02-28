/**
 * CompactScoreBar Component Tests
 *
 * Tests the 48px inline score bar: team names/scores, period/time, expand toggle, ARIA.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CompactScoreBar } from '../scoreboard/CompactScoreBar';
import type { TeamData } from '../scoreboard/Scoreboard';

const defaultHomeTeam: TeamData = {
  name: 'Home',
  abbreviation: 'HOM',
  score: 3,
  color: '#3B82F6',
};

const defaultAwayTeam: TeamData = {
  name: 'Away',
  abbreviation: 'AWY',
  score: 2,
  color: '#EF4444',
};

const defaultProps = {
  homeTeam: defaultHomeTeam,
  awayTeam: defaultAwayTeam,
  period: 'H1',
  time: '23:45',
  isExpanded: false,
  onToggleExpand: vi.fn(),
};

describe('CompactScoreBar', () => {
  beforeEach(() => {
    defaultProps.onToggleExpand.mockClear();
  });

  describe('rendering', () => {
    it('should render team abbreviations and scores', () => {
      render(<CompactScoreBar {...defaultProps} />);

      expect(screen.getByTestId('compact-score-bar')).toBeInTheDocument();
      expect(screen.getByText('HOM')).toBeInTheDocument();
      expect(screen.getByText('AWY')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show period and time when provided', () => {
      render(<CompactScoreBar {...defaultProps} />);

      expect(screen.getByText('H1')).toBeInTheDocument();
      expect(screen.getByText('23:45')).toBeInTheDocument();
    });

    it('should truncate team name to 3 chars when no abbreviation', () => {
      render(
        <CompactScoreBar
          {...defaultProps}
          homeTeam={{ ...defaultHomeTeam, abbreviation: undefined, name: 'Tigers' }}
          awayTeam={{ ...defaultAwayTeam, abbreviation: undefined, name: 'Bears' }}
        />,
      );

      expect(screen.getByText('TIG')).toBeInTheDocument();
      expect(screen.getByText('BEA')).toBeInTheDocument();
    });

    it('should use custom data-testid when provided', () => {
      render(<CompactScoreBar {...defaultProps} data-testid="custom-score-bar" />);
      expect(screen.getByTestId('custom-score-bar')).toBeInTheDocument();
    });
  });

  describe('expand toggle', () => {
    it('should call onToggleExpand when clicked', () => {
      render(<CompactScoreBar {...defaultProps} />);
      fireEvent.click(screen.getByTestId('compact-score-bar'));
      expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should rotate chevron when isExpanded is true', () => {
      const { container } = render(<CompactScoreBar {...defaultProps} isExpanded={true} />);
      const button = screen.getByTestId('compact-score-bar');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('rotate-180');
    });

    it('should not have rotate-180 when isExpanded is false', () => {
      render(<CompactScoreBar {...defaultProps} isExpanded={false} />);
      const button = screen.getByTestId('compact-score-bar');
      const svg = button.querySelector('svg');
      expect(svg).not.toHaveClass('rotate-180');
    });
  });

  describe('period and time', () => {
    it('should not show period/time section when both omitted', () => {
      render(
        <CompactScoreBar
          {...defaultProps}
          period={undefined}
          time={undefined}
        />,
      );
      expect(screen.queryByText('H1')).not.toBeInTheDocument();
      expect(screen.queryByText('23:45')).not.toBeInTheDocument();
    });

    it('should show only period when time omitted', () => {
      render(<CompactScoreBar {...defaultProps} time={undefined} />);
      expect(screen.getByText('H1')).toBeInTheDocument();
    });

    it('should show only time when period omitted', () => {
      render(<CompactScoreBar {...defaultProps} period={undefined} />);
      expect(screen.getByText('23:45')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be a button for keyboard and screen reader', () => {
      render(<CompactScoreBar {...defaultProps} />);
      const btn = screen.getByTestId('compact-score-bar');
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
    });
  });
});
