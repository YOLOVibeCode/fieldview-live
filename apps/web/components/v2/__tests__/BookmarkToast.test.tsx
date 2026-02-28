/**
 * BookmarkToast Component Tests
 *
 * Tests toast stack (max 3 visible), onJumpTo, onDismiss, auto-dismiss timer, useBookmarkToasts hook.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BookmarkToast, useBookmarkToasts, type BookmarkToastItem } from '../video/BookmarkToast';

const toast1: BookmarkToastItem = {
  id: 't1',
  label: 'Goal!',
  time: '12:34',
  timestampSeconds: 754,
};

const toast2: BookmarkToastItem = {
  id: 't2',
  label: 'Half time',
  time: '45:00',
  timestampSeconds: 2700,
};

const toast3: BookmarkToastItem = {
  id: 't3',
  label: 'Full time',
  time: '90:00',
  timestampSeconds: 5400,
};

const toast4: BookmarkToastItem = {
  id: 't4',
  label: 'Extra',
  time: '95:00',
  timestampSeconds: 5700,
};

describe('BookmarkToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should return null when toasts array is empty', () => {
      const { container } = render(<BookmarkToast toasts={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render toast stack with labels and times', () => {
      render(<BookmarkToast toasts={[toast1, toast2]} />);
      expect(screen.getByTestId('bookmark-toasts')).toBeInTheDocument();
      expect(screen.getByText('Goal!')).toBeInTheDocument();
      expect(screen.getByText('12:34')).toBeInTheDocument();
      expect(screen.getByText('Half time')).toBeInTheDocument();
      expect(screen.getByText('45:00')).toBeInTheDocument();
    });

    it('should show max 3 toasts when more than 3 provided', () => {
      render(<BookmarkToast toasts={[toast1, toast2, toast3, toast4]} />);
      expect(screen.getByTestId('bookmark-toasts')).toBeInTheDocument();
      // slice(-3) keeps last 3: t2, t3, t4
      expect(screen.queryByText('Goal!')).not.toBeInTheDocument();
      expect(screen.getByText('Half time')).toBeInTheDocument();
      expect(screen.getByText('Full time')).toBeInTheDocument();
      expect(screen.getByText('Extra')).toBeInTheDocument();
    });

    it('should have data-testid per toast', () => {
      render(<BookmarkToast toasts={[toast1]} />);
      expect(screen.getByTestId('toast-bookmark-t1')).toBeInTheDocument();
    });
  });

  describe('onDismiss', () => {
    it('should call onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn();
      render(<BookmarkToast toasts={[toast1]} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByTestId('btn-dismiss-toast-t1'));
      expect(onDismiss).toHaveBeenCalledWith('t1');
    });

    it('should auto-dismiss after 4 seconds', () => {
      const onDismiss = vi.fn();
      render(<BookmarkToast toasts={[toast1]} onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(4000);
      expect(onDismiss).toHaveBeenCalledWith('t1');
    });
  });

  describe('onJumpTo', () => {
    it('should call onJumpTo with timestamp when Jump to clicked', () => {
      const onJumpTo = vi.fn();
      const onDismiss = vi.fn();
      render(
        <BookmarkToast toasts={[toast1]} onJumpTo={onJumpTo} onDismiss={onDismiss} />,
      );
      fireEvent.click(screen.getByTestId('btn-toast-jump-t1'));
      expect(onJumpTo).toHaveBeenCalledWith(754);
      expect(onDismiss).toHaveBeenCalledWith('t1');
    });

    it('should not render Jump to button when onJumpTo not provided', () => {
      render(<BookmarkToast toasts={[toast1]} />);
      expect(screen.queryByTestId('btn-toast-jump-t1')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role status and aria-live polite on toast', () => {
      render(<BookmarkToast toasts={[toast1]} />);
      const toast = screen.getByTestId('toast-bookmark-t1');
      expect(toast).toHaveAttribute('role', 'status');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on Jump to button', () => {
      render(<BookmarkToast toasts={[toast1]} onJumpTo={vi.fn()} />);
      expect(screen.getByLabelText('Jump to 12:34')).toBeInTheDocument();
    });

    it('should have aria-label on dismiss button', () => {
      render(<BookmarkToast toasts={[toast1]} onDismiss={vi.fn()} />);
      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });
  });
});

describe('useBookmarkToasts', () => {
  it('should add and dismiss toasts', () => {
    function TestHarness() {
      const { toasts, addToast, dismissToast } = useBookmarkToasts();
      return (
        <div>
          <button
            type="button"
            data-testid="btn-add"
            onClick={() => addToast(toast1)}
          >
            Add
          </button>
          <button
            type="button"
            data-testid="btn-dismiss"
            onClick={() => dismissToast('t1')}
          >
            Dismiss
          </button>
          <BookmarkToast toasts={toasts} onDismiss={dismissToast} />
        </div>
      );
    }
    render(<TestHarness />);
    expect(screen.queryByTestId('bookmark-toasts')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-add'));
    expect(screen.getByTestId('bookmark-toasts')).toBeInTheDocument();
    expect(screen.getByText('Goal!')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-dismiss'));
    expect(screen.queryByTestId('bookmark-toasts')).not.toBeInTheDocument();
  });

  it('should not duplicate toast for same id', () => {
    function TestHarness() {
      const { toasts, addToast } = useBookmarkToasts();
      return (
        <div>
          <button
            type="button"
            data-testid="btn-add"
            onClick={() => {
              addToast(toast1);
              addToast(toast1);
            }}
          >
            Add twice
          </button>
          <BookmarkToast toasts={toasts} />
        </div>
      );
    }
    render(<TestHarness />);
    fireEvent.click(screen.getByTestId('btn-add'));
    expect(screen.getAllByText('Goal!')).toHaveLength(1);
  });
});
