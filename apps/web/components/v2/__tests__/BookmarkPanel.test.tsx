/**
 * BookmarkPanel Component Tests
 *
 * Tests open/close, tabs (My Bookmarks, All Shared), onSeek passed through, mode variants.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookmarkPanel } from '../video/BookmarkPanel';

vi.mock('@/components/dvr/BookmarksList', () => ({
  BookmarksList: ({
    onSeek,
    viewerId,
    directStreamId,
    includeShared,
  }: {
    onSeek: (timeSeconds: number) => void;
    viewerId?: string;
    directStreamId: string;
    includeShared?: boolean;
  }) => (
    <div data-testid="bookmarks-list">
      <span data-testid="list-mode">{includeShared ? 'all' : 'mine'}</span>
      <button
        type="button"
        data-testid="btn-seek"
        onClick={() => onSeek(120)}
      >
        Jump to 2:00
      </button>
    </div>
  ),
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  directStreamId: 'stream-1',
  viewerId: 'viewer-1',
  onSeek: vi.fn(),
};

describe('BookmarkPanel', () => {
  beforeEach(() => {
    defaultProps.onClose.mockClear();
    defaultProps.onSeek.mockClear();
  });

  describe('open/close', () => {
    it('should render when isOpen is true (sidebar mode)', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      expect(screen.getByTestId('bookmark-panel')).toBeInTheDocument();
    });

    it('should return null when isOpen is false and not inline', () => {
      const { container } = render(
        <BookmarkPanel {...defaultProps} isOpen={false} isMobile={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('should call onClose when close button clicked (sidebar)', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      fireEvent.click(screen.getByTestId('btn-close-bookmark-panel'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when collapse/back clicked (inline)', () => {
      render(<BookmarkPanel {...defaultProps} mode="inline" />);
      fireEvent.click(screen.getByTestId('btn-collapse-bookmark-inline'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('tabs', () => {
    it('should show My Bookmarks and All Shared tabs', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      expect(screen.getByTestId('tab-mine')).toHaveTextContent('My Bookmarks');
      expect(screen.getByTestId('tab-all')).toHaveTextContent('All Shared');
    });

    it('should switch content when tab changed', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      expect(screen.getByTestId('list-mode')).toHaveTextContent('mine');
      fireEvent.click(screen.getByTestId('tab-all'));
      expect(screen.getByTestId('list-mode')).toHaveTextContent('all');
    });
  });

  describe('onSeek', () => {
    it('should call onSeek with time when bookmark list triggers seek', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      fireEvent.click(screen.getByTestId('btn-seek'));
      expect(defaultProps.onSeek).toHaveBeenCalledWith(120);
    });
  });

  describe('mode variants', () => {
    it('should render inline mode with bookmark-panel-inline', () => {
      render(<BookmarkPanel {...defaultProps} mode="inline" />);
      expect(screen.getByTestId('bookmark-panel-inline')).toBeInTheDocument();
    });

    it('should render sidebar mode with bookmark-panel when isMobile false', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      expect(screen.getByTestId('bookmark-panel')).toBeInTheDocument();
    });

    it('should have aria-label on sidebar panel', () => {
      render(<BookmarkPanel {...defaultProps} isMobile={false} />);
      expect(screen.getByRole('dialog', { name: /bookmarks panel/i })).toBeInTheDocument();
    });
  });
});
