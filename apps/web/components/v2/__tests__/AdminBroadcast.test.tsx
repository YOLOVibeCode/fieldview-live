/**
 * AdminBroadcast Component Tests
 *
 * Tests the admin broadcast overlay: message render, onDismiss, auto-hide timer, ARIA.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminBroadcast } from '../chat/AdminBroadcast';

const defaultProps = {
  message: 'Stream starting in 5 minutes.',
  onDismiss: vi.fn(),
  autoHideSeconds: 10,
};

describe('AdminBroadcast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    defaultProps.onDismiss.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render message text', () => {
      render(<AdminBroadcast {...defaultProps} />);
      expect(screen.getByTestId('admin-broadcast-overlay')).toBeInTheDocument();
      expect(screen.getByText(/Stream starting in 5 minutes/)).toBeInTheDocument();
      expect(screen.getByText('Announcement:')).toBeInTheDocument();
    });

    it('should use custom autoHideSeconds', () => {
      render(<AdminBroadcast {...defaultProps} autoHideSeconds={5} />);
      expect(screen.getByTestId('admin-broadcast-overlay')).toBeInTheDocument();
      vi.advanceTimersByTime(5000);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDismiss', () => {
    it('should call onDismiss when clicked', () => {
      render(<AdminBroadcast {...defaultProps} />);
      fireEvent.click(screen.getByTestId('admin-broadcast-overlay'));
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should auto-hide after autoHideSeconds', () => {
      render(<AdminBroadcast {...defaultProps} autoHideSeconds={10} />);
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10000);
      expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not set timer when autoHideSeconds is 0', () => {
      render(<AdminBroadcast {...defaultProps} autoHideSeconds={0} />);
      vi.advanceTimersByTime(100000);
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label with message and dismiss hint', () => {
      render(<AdminBroadcast {...defaultProps} />);
      const btn = screen.getByTestId('admin-broadcast-overlay');
      expect(btn).toHaveAttribute(
        'aria-label',
        'Admin message: Stream starting in 5 minutes.. Click to dismiss.',
      );
    });

    it('should be a button', () => {
      render(<AdminBroadcast {...defaultProps} />);
      const btn = screen.getByTestId('admin-broadcast-overlay');
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
    });
  });
});
