/**
 * TDD Tests for ScoreEditModal Component
 * 
 * Tests the tap-to-edit score functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScoreEditModal } from '../ScoreEditModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ScoreEditModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ScoreEditModal
        isOpen={false}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('modal-score-edit')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('modal-score-edit')).toBeInTheDocument();
    expect(screen.getByText(/Edit Home Team Score/i)).toBeInTheDocument();
  });

  it('should display current score in input', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={7}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit') as HTMLInputElement;
    expect(input.value).toBe('7');
  });

  it('should allow changing the score', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="away"
        currentScore={3}
        teamName="Away Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit');
    fireEvent.change(input, { target: { value: '10' } });

    expect((input as HTMLInputElement).value).toBe('10');
  });

  it('should call onSave with new score on submit', async () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit');
    fireEvent.change(input, { target: { value: '12' } });

    const saveButton = screen.getByTestId('btn-save-score');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('home', 12);
    });
  });

  it('should call onClose when cancel is clicked', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByTestId('btn-cancel-score');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should prevent negative scores', async () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit');
    fireEvent.change(input, { target: { value: '-3' } });

    const saveButton = screen.getByTestId('btn-save-score');
    fireEvent.click(saveButton);

    // Should save as 0, not negative
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('home', 0);
    });
  });

  it('should handle very large scores', async () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="away"
        currentScore={5}
        teamName="Away Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit');
    fireEvent.change(input, { target: { value: '999' } });

    const saveButton = screen.getByTestId('btn-save-score');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('away', 999);
    });
  });

  it('should show loading state when saving', async () => {
    const slowSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={slowSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit');
    fireEvent.change(input, { target: { value: '10' } });

    const saveButton = screen.getByTestId('btn-save-score');
    fireEvent.click(saveButton);

    // Button should be disabled during save
    expect(saveButton).toBeDisabled();
  });

  it('should have large touch target for mobile (44px minimum)', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const saveButton = screen.getByTestId('btn-save-score');
    const styles = window.getComputedStyle(saveButton);
    
    // Button should have min-height for mobile accessibility
    expect(saveButton.className).toContain('min-h-');
  });

  it('should auto-select input text when opened', () => {
    render(
      <ScoreEditModal
        isOpen={true}
        team="home"
        currentScore={5}
        teamName="Home Team"
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByTestId('input-score-edit') as HTMLInputElement;
    
    // Input should be focused for immediate typing
    expect(input).toHaveFocus();
  });
});

