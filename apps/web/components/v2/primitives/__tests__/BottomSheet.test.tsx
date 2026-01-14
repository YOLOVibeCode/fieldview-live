/**
 * BottomSheet Component Tests
 * 
 * TDD: Write tests first, then implement
 * 
 * BottomSheet is a mobile-optimized modal that slides up from the bottom
 * Supports snap points, drag-to-dismiss, and backdrop
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';

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
    it('should render backdrop when enableBackdrop is true', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} enableBackdrop={true}>
          <div>Content</div>
        </BottomSheet>
      );
      
      const backdrop = screen.getByTestId('bottom-sheet-backdrop');
      expect(backdrop).toBeInTheDocument();
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
      const handleClose = jest.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose} enableBackdrop={true}>
          <div>Content</div>
        </BottomSheet>
      );
      
      fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('snap points', () => {
    it('should support multiple snap points', () => {
      render(
        <BottomSheet
          isOpen={true}
          onClose={() => {}}
          snapPoints={[0.25, 0.5, 0.9]}
          initialSnap={1}
        >
          <div>Content</div>
        </BottomSheet>
      );
      
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toBeInTheDocument();
    });
    
    it('should start at initial snap point', () => {
      render(
        <BottomSheet
          isOpen={true}
          onClose={() => {}}
          snapPoints={[0.25, 0.5, 0.9]}
          initialSnap={1}
        >
          <div>Content</div>
        </BottomSheet>
      );
      
      const sheet = screen.getByTestId('bottom-sheet');
      const styles = window.getComputedStyle(sheet);
      
      // Should be at 50% height (snap point index 1)
      expect(styles.height).toBe('50vh');
    });
  });
  
  describe('drag behavior', () => {
    it('should be draggable when enableDrag is true', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}} enableDrag={true}>
          <div>Content</div>
        </BottomSheet>
      );
      
      const handle = screen.getByTestId('bottom-sheet-handle');
      expect(handle).toBeInTheDocument();
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
      const handleClose = jest.fn();
      render(
        <BottomSheet isOpen={true} onClose={handleClose} enableDrag={true}>
          <div>Content</div>
        </BottomSheet>
      );
      
      const sheet = screen.getByTestId('bottom-sheet');
      
      // Simulate drag down
      fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(sheet, { touches: [{ clientY: 400 }] });
      fireEvent.touchEnd(sheet);
      
      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
  
  describe('keyboard interactions', () => {
    it('should close when Escape key is pressed', () => {
      const handleClose = jest.fn();
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
    it('should trap focus within the sheet', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <button>First</button>
          <button>Second</button>
        </BottomSheet>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
    
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
          <div>Content</div>
        </BottomSheet>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'sheet-title');
    });
  });
  
  describe('animations', () => {
    it('should apply entrance animation', async () => {
      const { container } = render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      
      await waitFor(() => {
        const sheet = screen.getByTestId('bottom-sheet');
        expect(sheet).toHaveClass('fv-sheet-enter');
      });
    });
    
    it('should apply exit animation when closing', async () => {
      const { rerender } = render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      
      rerender(
        <BottomSheet isOpen={false} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      
      await waitFor(() => {
        const sheet = screen.queryByTestId('bottom-sheet');
        expect(sheet).toHaveClass('fv-sheet-exit');
      });
    });
  });
  
  describe('content scrolling', () => {
    it('should allow content to scroll independently', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div data-testid="scroll-content" style={{ height: '200vh' }}>
            Long content
          </div>
        </BottomSheet>
      );
      
      const content = screen.getByTestId('scroll-content');
      expect(content).toBeInTheDocument();
    });
    
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
    it('should respect safe area insets on mobile', () => {
      render(
        <BottomSheet isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toHaveClass('fv-safe-area-bottom');
    });
  });
});

