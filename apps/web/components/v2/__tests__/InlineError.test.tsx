import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InlineError } from '../InlineError';

describe('InlineError', () => {
  it('should render error message', () => {
    render(<InlineError message="Field is required" />);
    
    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('should apply data-testid', () => {
    render(<InlineError message="Error" data-testid="custom-error" />);
    
    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
  });

  it('should have red styling', () => {
    render(<InlineError message="Error" data-testid="inline-error" />);
    
    const error = screen.getByTestId('inline-error');
    expect(error).toHaveClass('text-red-600');
  });

  it('should be small and compact', () => {
    render(<InlineError message="Error" data-testid="inline-error" />);
    
    const error = screen.getByTestId('inline-error');
    expect(error).toHaveClass('text-sm');
  });

  it('should display error icon', () => {
    render(<InlineError message="Error" data-testid="inline-error" />);
    
    const error = screen.getByTestId('inline-error');
    expect(error.querySelector('svg')).toBeInTheDocument();
  });

  it('should use flex layout for icon and message', () => {
    render(<InlineError message="Error" data-testid="inline-error" />);
    
    const error = screen.getByTestId('inline-error');
    expect(error).toHaveClass('flex');
    expect(error).toHaveClass('items-center');
    expect(error).toHaveClass('gap-1');
  });

  it('should have role="alert" for accessibility', () => {
    render(<InlineError message="Error" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
