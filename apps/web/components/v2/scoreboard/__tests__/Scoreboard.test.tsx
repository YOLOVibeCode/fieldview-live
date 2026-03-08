/**
 * Scoreboard Component Tests
 * 
 * TDD: Main scoreboard component with multiple modes
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Scoreboard } from '../Scoreboard';

describe('Scoreboard', () => {
  const defaultProps = {
    homeTeam: { name: 'Home Team', score: 42, color: '#3B82F6' },
    awayTeam: { name: 'Away Team', score: 38, color: '#EF4444' },
  };
  
  describe('rendering', () => {
    it('should render both teams', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.getByText('Home Team')).toBeInTheDocument();
      expect(screen.getByText('Away Team')).toBeInTheDocument();
    });
    
    it('should render scores', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
    });
    
    it('should highlight winning team', () => {
      render(<Scoreboard {...defaultProps} />);
      const cards = screen.getAllByTestId('score-card');
      expect(cards[0]).toHaveClass('winning'); // Home team
    });
  });
  
  describe('modes', () => {
    it('should render floating mode', () => {
      render(<Scoreboard {...defaultProps} mode="floating" data-testid="scoreboard" />);
      const scoreboard = screen.getByTestId('scoreboard');
      expect(scoreboard).toHaveClass('floating');
    });
    
    it('should render sidebar mode', () => {
      render(<Scoreboard {...defaultProps} mode="sidebar" data-testid="scoreboard" />);
      const scoreboard = screen.getByTestId('scoreboard');
      expect(scoreboard).toHaveClass('sidebar');
    });
    
    it('should render minimal mode', () => {
      render(<Scoreboard {...defaultProps} mode="minimal" data-testid="scoreboard" />);
      const scoreboard = screen.getByTestId('scoreboard');
      expect(scoreboard).toHaveClass('minimal');
    });
  });
  
  describe('editing', () => {
    it('should show edit sheet when team is tapped', async () => {
      render(<Scoreboard {...defaultProps} editable onScoreUpdate={() => {}} />);
      
      const homeCard = screen.getAllByTestId('score-card-button')[0];
      fireEvent.click(homeCard);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Score')).toBeInTheDocument();
      });
    });
    
    it('should call onScoreUpdate with new score', async () => {
      const handleUpdate = vi.fn();
      render(<Scoreboard {...defaultProps} editable onScoreUpdate={handleUpdate} />);
      
      // Open edit sheet
      const homeCard = screen.getAllByTestId('score-card-button')[0];
      fireEvent.click(homeCard);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Score')).toBeInTheDocument();
      });
      
      // Change score
      const input = screen.getByDisplayValue('42');
      fireEvent.change(input, { target: { value: '50' } });
      
      // Save
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(handleUpdate).toHaveBeenCalledWith('home', 50);
      });
    });
    
    it('should not be editable when editable prop is false', () => {
      render(<Scoreboard {...defaultProps} editable={false} />);
      expect(screen.queryByTestId('score-card-button')).not.toBeInTheDocument();
    });
  });
  
  describe('game clock', () => {
    it('should render game clock when provided', () => {
      render(<Scoreboard {...defaultProps} period="1st Half" time="23:45" />);
      expect(screen.getByText('1st Half')).toBeInTheDocument();
      expect(screen.getByText('23:45')).toBeInTheDocument();
    });
    
    it('should not render game clock when not provided', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.queryByTestId('game-clock')).not.toBeInTheDocument();
    });
  });
  
  describe('accessibility', () => {
    it('should have proper region role', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
    
    it('should have aria-label', () => {
      render(<Scoreboard {...defaultProps} />);
      expect(screen.getByLabelText(/scoreboard/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show fetch error banner when error prop is provided', () => {
      render(<Scoreboard {...defaultProps} error="Server error. Please try again in a moment." />);
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText('Server error. Please try again in a moment.')).toBeInTheDocument();
    });

    it('should show dismiss button on error banner', () => {
      render(<Scoreboard {...defaultProps} error="Network error" onClearError={() => {}} />);
      const dismissButton = screen.getByTestId('btn-dismiss-error');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should dismiss error when dismiss button is clicked', () => {
      const handleClearError = vi.fn();
      render(<Scoreboard {...defaultProps} error="Network error" onClearError={handleClearError} />);
      
      const dismissButton = screen.getByTestId('btn-dismiss-error');
      fireEvent.click(dismissButton);
      
      expect(handleClearError).toHaveBeenCalled();
    });

    it('should show save error toast when saveError prop is provided', () => {
      render(<Scoreboard {...defaultProps} saveError="You do not have permission to edit scores." />);
      expect(screen.getByTestId('error-toast')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to edit scores.')).toBeInTheDocument();
    });

    it('should auto-dismiss save error after 5 seconds', () => {
      vi.useFakeTimers();
      try {
        const handleClearSaveError = vi.fn();
        render(
          <Scoreboard {...defaultProps} saveError="Save failed" onClearSaveError={handleClearSaveError} />
        );
        
        expect(screen.getByTestId('error-toast')).toBeInTheDocument();
        
        // Fast-forward 5 seconds
        vi.advanceTimersByTime(5000);
        
        expect(handleClearSaveError).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should show retry button in error toast', () => {
      render(<Scoreboard {...defaultProps} saveError="Network error" onRetry={() => {}} />);
      expect(screen.getByTestId('btn-retry')).toBeInTheDocument();
    });

    it('should not block score editing when error banner is shown', async () => {
      const handleUpdate = vi.fn().mockResolvedValue(undefined);
      const { getAllByTestId } = render(
        <Scoreboard {...defaultProps} error="Fetch error" editable onScoreUpdate={handleUpdate} />
      );
      
      // Error banner should be visible
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      
      // But editing should still work
      const homeCards = getAllByTestId('score-card-button');
      expect(homeCards.length).toBeGreaterThan(0);
      fireEvent.click(homeCards[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Score')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});

