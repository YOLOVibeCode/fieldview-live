import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render error message', () => {
    render(<ErrorBanner message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should apply data-testid', () => {
    render(<ErrorBanner message="Error" data-testid="custom-error" />);
    
    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorBanner message="Error" />);
    
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('should render retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(<ErrorBanner message="Error" />);
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('should render both dismiss and retry buttons when both callbacks are provided', () => {
    const onDismiss = vi.fn();
    const onRetry = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} onRetry={onRetry} />);
    
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should have red styling for error state', () => {
    render(<ErrorBanner message="Error" data-testid="error-banner" />);
    
    const banner = screen.getByTestId('error-banner');
    expect(banner).toHaveClass('bg-red-50');
    expect(banner).toHaveClass('border-red-200');
  });

  it('should display error icon', () => {
    render(<ErrorBanner message="Error" />);
    
    const banner = screen.getByRole('alert');
    expect(banner.querySelector('svg')).toBeInTheDocument();
  });
});
