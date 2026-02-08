/**
 * BottomSheet Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';
import { describe, it, expect, vi } from 'vitest';

describe('BottomSheet', () => {
  describe('visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <BottomSheet isOpen={false} onClose={() => {}}>
          <div data-testid="content">Content</div>
        </BottomSheet>
      );
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div data-testid="content">Content</div>
        </BottomSheet>
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should have proper ARIA role', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('backdrop', () => {
    it('should render backdrop by default', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument();
    });

    it('should not render backdrop when enableBackdrop is false', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} enableBackdrop={false}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(screen.queryByTestId('bottom-sheet-backdrop')).not.toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </BottomSheet>
      );
      fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('snap points', () => {
    it('should set height based on snap point', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} snapPoints={[0.5]} initialSnap={0}>
          <div>Content</div>
        </BottomSheet>
      );
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet.style.height).toBe('50vh');
    });

    it('should use initial snap index', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} snapPoints={[0.25, 0.5, 0.9]} initialSnap={2}>
          <div>Content</div>
        </BottomSheet>
      );
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet.style.height).toBe('90vh');
    });
  });

  describe('drag behavior', () => {
    it('should show handle when enableDrag is true', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} enableDrag={true}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
    });

    it('should not show handle when enableDrag is false', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} enableDrag={false}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(screen.queryByTestId('bottom-sheet-handle')).not.toBeInTheDocument();
    });

    it('should close when dragged down past threshold', async () => {
      // Mock window.innerHeight for threshold calculation
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const handleClose = vi.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose} enableDrag={true}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      // Drag down more than 25% of viewport (800 * 0.25 = 200)
      fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(sheet, { touches: [{ clientY: 400 }] });
      fireEvent.touchEnd(sheet);

      expect(handleClose).toHaveBeenCalled();
    });

    it('should NOT close when dragged down less than threshold', () => {
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const handleClose = vi.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose} enableDrag={true}>
          <div>Content</div>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottom-sheet');
      // Drag down less than 25% of viewport
      fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(sheet, { touches: [{ clientY: 200 }] });
      fireEvent.touchEnd(sheet);

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('should close when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </BottomSheet>
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have aria-modal attribute', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby when provided', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} aria-labelledby="sheet-title">
          <h2 id="sheet-title">Title</h2>
        </BottomSheet>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'sheet-title');
    });
  });

  describe('body scroll lock', () => {
    it('should prevent body scroll when open', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('safe area', () => {
    it('should have safe area class', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet.className).toContain('fv-safe-area-bottom');
    });
  });
});
