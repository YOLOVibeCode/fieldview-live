/**
 * SeekConfirmOverlay: confirmation dialog for large seeks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeekConfirmOverlay } from '../SeekConfirmOverlay';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

describe('SeekConfirmOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders target time formatted correctly', () => {
    render(
      <SeekConfirmOverlay
        targetTime={154}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        timeoutMs={3000}
      />
    );
    expect(screen.getByText(formatTime(154))).toBeInTheDocument();
  });

  it('calls onConfirm when Jump button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <SeekConfirmOverlay
        targetTime={120}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        timeoutMs={3000}
      />
    );
    const jump = screen.getByRole('button', { name: /jump to position/i });
    fireEvent.click(jump);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <SeekConfirmOverlay
        targetTime={120}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        timeoutMs={3000}
      />
    );
    const cancel = screen.getByRole('button', { name: /cancel seek/i });
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('auto-cancels after timeout', () => {
    const onCancel = vi.fn();
    render(
      <SeekConfirmOverlay
        targetTime={120}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        timeoutMs={3000}
      />
    );
    expect(onCancel).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has proper data-testid and ARIA attributes', () => {
    render(
      <SeekConfirmOverlay
        targetTime={0}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        timeoutMs={3000}
      />
    );
    const overlay = screen.getByTestId('seek-confirm-overlay');
    expect(overlay).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: /jump to/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('btn-seek-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('btn-seek-cancel')).toBeInTheDocument();
  });
});
