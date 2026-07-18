/**
 * ScoreEditSheet Component Tests
 * 
 * TDD: Bottom sheet for editing team scores
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScoreEditSheet } from '../ScoreEditSheet';

describe('ScoreEditSheet', () => {
  const defaultProps = {
    isOpen: true,
    teamName: 'Home Team',
    currentScore: 42,
    teamColor: '#3B82F6',
    onSave: vi.fn(),
    onClose: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
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
      const handleSave = vi.fn();
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      const input = screen.getByDisplayValue('42');
      fireEvent.change(input, { target: { value: '50' } });
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith(50);
      });
    });
    
    it('should close after saving', async () => {
      const handleClose = vi.fn();
      render(<ScoreEditSheet {...defaultProps} onClose={handleClose} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
  
  describe('cancel action', () => {
    it('should call onClose without saving', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();
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

  describe('error handling', () => {
    it('should display error message when onSave fails', async () => {
      const handleSave = vi.fn().mockRejectedValue(
        new Error('You do not have permission to edit scores.')
      );
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(screen.getByText('You do not have permission to edit scores.')).toBeInTheDocument();
      });
    });

    it('should style error message with error colors', async () => {
      const handleSave = vi.fn().mockRejectedValue(new Error('Server error'));
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        const errorElement = screen.getByTestId('error-message');
        expect(errorElement).toHaveClass('bg-red-50', 'border-red-200');
      });
    });

    it('should show retry button after error', async () => {
      const handleSave = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(screen.getByTestId('btn-retry')).toBeInTheDocument();
      });
    });

    it('should call onSave again when retry button is clicked', async () => {
      const handleSave = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(screen.getByTestId('btn-retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('btn-retry'));
      
      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear error on successful retry', async () => {
      const handleSave = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      fireEvent.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('btn-retry'));
      
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      const handleSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      const saveButton = screen.getByText('Save').closest('button');
      fireEvent.click(saveButton!);
      
      await waitFor(() => {
        expect(saveButton).toHaveAttribute('data-loading', 'true');
      });
    });

    it('should disable save button while saving', async () => {
      const handleSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ScoreEditSheet {...defaultProps} onSave={handleSave} />);
      
      const saveButton = screen.getByText('Save').closest('button');
      fireEvent.click(saveButton!);
      
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });
});

