/**
 * GoLiveButton: recovery button for DVR when behind live edge.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoLiveButton } from '../GoLiveButton';

describe('GoLiveButton', () => {
  it('renders when visible=true', () => {
    render(
      <GoLiveButton visible onClick={vi.fn()} />
    );
    expect(screen.getByTestId('btn-go-live')).toBeInTheDocument();
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it('is hidden when visible=false', () => {
    render(
      <GoLiveButton visible={false} onClick={vi.fn()} />
    );
    expect(screen.queryByTestId('btn-go-live')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<GoLiveButton visible onClick={onClick} />);
    fireEvent.click(screen.getByTestId('btn-go-live'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows LIVE text with red dot indicator', () => {
    render(<GoLiveButton visible onClick={vi.fn()} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    const btn = screen.getByTestId('btn-go-live');
    const dot = btn.querySelector('[data-testid="go-live-dot"]');
    expect(dot).toBeInTheDocument();
  });

  it('has proper data-testid and ARIA', () => {
    render(<GoLiveButton visible onClick={vi.fn()} />);
    const btn = screen.getByTestId('btn-go-live');
    expect(btn).toHaveAttribute('aria-label', 'Go to live');
  });
});
