/**
 * ScoreEditSheet Component Tests
 * 
 * TDD: Bottom sheet for editing team scores
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScoreEditSheet } from '../ScoreEditSheet';

describe('ScoreEditSheet', () => {
  const defaultProps = {
    isOpen: true,
    teamName: 'Home Team',
    currentScore: 42,
    teamColor: '#3B82F6',
    onSave: jest.fn(),
    onClose: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });
    
    it('should not render when isOpen is false', () => {
      render(<ScoreEditSheet {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Home Team')).not.toBeInTheDocument();
    });
  });
  
  describe('score input', () => {
    it('should show current score in input', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42');
      expect(input).toBeInTheDocument();
    });
    
    it('should allow typing new score', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '55' } });
      expect(input.value).toBe('55');
    });
    
    it('should only accept numeric input', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(input.value).toBe('42'); // Should not change
    });
    
    it('should not allow negative numbers', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '-5' } });
      expect(input.value).toBe('42'); // Should not change
    });
  });
  
  describe('quick increment buttons', () => {
    it('should show +1, +2, +3 buttons', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.getByText('+3')).toBeInTheDocument();
    });
    
    it('should increment score by 1', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.click(screen.getByText('+1'));
      expect(input.value).toBe('43');
    });
    
    it('should increment score by 2', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.click(screen.getByText('+2'));
      expect(input.value).toBe('44');
    });
    
    it('should increment score by 3', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42') as HTMLInputElement;
      
      fireEvent.click(screen.getByText('+3'));
      expect(input.value).toBe('45');
    });
  });
  
  describe('save action', () => {
    it('should call onSave with new score', async () => {
      const handleSave = jest.fn();
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      const input = screen.getByDisplayValue('42');
      fireEvent.change(input, { target: { value: '50' } });
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith(50);
      });
    });
    
    it('should close after saving', async () => {
      const handleClose = jest.fn();
      render(<ScoreEditSheet {...defaultProps} onClose={handleClose} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
  
  describe('cancel action', () => {
    it('should call onClose without saving', () => {
      const handleSave = jest.fn();
      const handleClose = jest.fn();
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} onClose={handleClose} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(handleClose).toHaveBeenCalled();
      expect(handleSave).not.toHaveBeenCalled();
    });
  });
  
  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      render(<ScoreEditSheet {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    it('should focus input on open', async () => {
      render(<ScoreEditSheet {...defaultProps} />);
      const input = screen.getByDisplayValue('42');
      
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });
});

