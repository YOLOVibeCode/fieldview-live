import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorToast } from '../ErrorToast';

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should render error message', () => {
    render(<ErrorToast message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should apply data-testid', () => {
    render(<ErrorToast message="Error" data-testid="custom-toast" />);
    
    expect(screen.getByTestId('custom-toast')).toBeInTheDocument();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorToast message="Error" />);
    
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<ErrorToast message="Error" />);
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('should auto-dismiss after default duration (5000ms)', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);
    
    expect(onDismiss).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(5000);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after custom duration', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} duration={3000} />);
    
    expect(onDismiss).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(3000);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss when duration is 0', () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} duration={0} />);
    
    vi.advanceTimersByTime(10000);
    
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should not auto-dismiss when onDismiss is not provided', () => {
    render(<ErrorToast message="Error" />);
    
    vi.advanceTimersByTime(10000);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should have red styling for error state', () => {
    render(<ErrorToast message="Error" data-testid="error-toast" />);
    
    const toast = screen.getByTestId('error-toast');
    expect(toast).toHaveClass('bg-red-50');
    expect(toast).toHaveClass('border-red-200');
  });

  it('should be positioned at bottom-right', () => {
    render(<ErrorToast message="Error" data-testid="error-toast" />);
    
    const toast = screen.getByTestId('error-toast');
    expect(toast).toHaveClass('fixed');
    expect(toast).toHaveClass('bottom-4');
    expect(toast).toHaveClass('right-4');
  });

  it('should display error icon', () => {
    render(<ErrorToast message="Error" />);
    
    const toast = screen.getByRole('alert');
    expect(toast.querySelector('svg')).toBeInTheDocument();
  });

  it('should cleanup timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<ErrorToast message="Error" onDismiss={onDismiss} />);
    
    unmount();
    vi.advanceTimersByTime(5000);
    
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
