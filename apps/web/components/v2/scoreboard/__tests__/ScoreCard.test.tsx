/**
 * ScoreCard Component Tests
 * 
 * TDD: Tappable team score display with colors
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ScoreCard } from '../ScoreCard';

describe('ScoreCard', () => {
  const defaultProps = {
    teamName: 'Home Team',
    score: 42,
    color: '#3B82F6',
  };
  
  describe('rendering', () => {
    it('should render team name', () => {
      render(<ScoreCard {...defaultProps} />);
      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });
    
    it('should render score', () => {
      render(<ScoreCard {...defaultProps} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    
    it('should apply team color', () => {
      render(<ScoreCard {...defaultProps} data-testid="score-card" />);
      const card = screen.getByTestId('score-card');
      expect(card.style.borderColor).toBe('rgb(59, 130, 246)'); // #3B82F6
    });
    
    it('should show abbreviation if provided', () => {
      render(<ScoreCard {...defaultProps} abbreviation="HT" />);
      expect(screen.getByText('HT')).toBeInTheDocument();
    });
  });
  
  describe('interactivity', () => {
    it('should be tappable when editable', () => {
      const handleTap = jest.fn();
      render(<ScoreCard {...defaultProps} editable onTap={handleTap} />);
      
      const card = screen.getByTestId('score-card-button');
      fireEvent.click(card);
      
      expect(handleTap).toHaveBeenCalledTimes(1);
    });
    
    it('should not be tappable when not editable', () => {
      const handleTap = jest.fn();
      render(<ScoreCard {...defaultProps} editable={false} onTap={handleTap} />);
      
      expect(screen.queryByTestId('score-card-button')).not.toBeInTheDocument();
    });
    
    it('should show edit indicator when editable', () => {
      render(<ScoreCard {...defaultProps} editable onTap={() => {}} />);
      expect(screen.getByLabelText(/tap to edit/i)).toBeInTheDocument();
    });
  });
  
  describe('variants', () => {
    it('should render compact variant', () => {
      render(<ScoreCard {...defaultProps} variant="compact" data-testid="score-card" />);
      const card = screen.getByTestId('score-card');
      expect(card).toHaveClass('compact');
    });
    
    it('should render large variant', () => {
      render(<ScoreCard {...defaultProps} variant="large" data-testid="score-card" />);
      const card = screen.getByTestId('score-card');
      expect(card).toHaveClass('large');
    });
  });
  
  describe('states', () => {
    it('should show winning state', () => {
      render(<ScoreCard {...defaultProps} winning data-testid="score-card" />);
      const card = screen.getByTestId('score-card');
      expect(card).toHaveClass('winning');
    });
    
    it('should show losing state', () => {
      render(<ScoreCard {...defaultProps} losing data-testid="score-card" />);
      const card = screen.getByTestId('score-card');
      expect(card).toHaveClass('losing');
    });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<ScoreCard {...defaultProps} />);
      expect(screen.getByLabelText(/Home Team.*42 points/i)).toBeInTheDocument();
    });
    
    it('should be keyboard accessible when editable', () => {
      const handleTap = jest.fn();
      render(<ScoreCard {...defaultProps} editable onTap={handleTap} />);
      
      const card = screen.getByTestId('score-card-button');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(handleTap).toHaveBeenCalledTimes(1);
    });
  });
});

