/**
 * Scoreboard Component Tests
 * 
 * TDD: Main scoreboard component with multiple modes
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      const handleUpdate = jest.fn();
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
});

