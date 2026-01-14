/**
 * TouchButton Component Tests
 * 
 * TDD: Write tests first, then implement
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { TouchButton } from '../TouchButton';

describe('TouchButton', () => {
  describe('rendering', () => {
    it('should render with children', () => {
      render(<TouchButton>Click me</TouchButton>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });
    
    it('should have minimum touch target size (44px)', () => {
      render(<TouchButton data-testid="touch-btn">Tap</TouchButton>);
      const button = screen.getByTestId('touch-btn');
      
      const styles = window.getComputedStyle(button);
      const minHeight = parseFloat(styles.minHeight);
      const minWidth = parseFloat(styles.minWidth);
      
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  });
  
  describe('variants', () => {
    it('should apply primary variant styles', () => {
      render(<TouchButton variant="primary" data-testid="btn">Primary</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-primary');
    });
    
    it('should apply secondary variant styles', () => {
      render(<TouchButton variant="secondary" data-testid="btn">Secondary</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-secondary');
    });
    
    it('should apply ghost variant styles', () => {
      render(<TouchButton variant="ghost" data-testid="btn">Ghost</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-ghost');
    });
    
    it('should apply danger variant styles', () => {
      render(<TouchButton variant="danger" data-testid="btn">Danger</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-danger');
    });
  });
  
  describe('sizes', () => {
    it('should apply sm size (36px)', () => {
      render(<TouchButton size="sm" data-testid="btn">Small</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-sm');
    });
    
    it('should apply md size (44px - default)', () => {
      render(<TouchButton size="md" data-testid="btn">Medium</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-md');
    });
    
    it('should apply lg size (52px)', () => {
      render(<TouchButton size="lg" data-testid="btn">Large</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-lg');
    });
  });
  
  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<TouchButton disabled>Disabled</TouchButton>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
    });
    
    it('should show loading state', () => {
      render(<TouchButton loading data-testid="btn">Loading</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });
    
    it('should show loading spinner when loading', () => {
      render(<TouchButton loading data-testid="btn">Loading</TouchButton>);
      
      expect(screen.getByTestId('btn-spinner')).toBeInTheDocument();
    });
  });
  
  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<TouchButton onClick={handleClick}>Click</TouchButton>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
    
    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<TouchButton onClick={handleClick} disabled>Disabled</TouchButton>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
    
    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<TouchButton onClick={handleClick} loading>Loading</TouchButton>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
  
  describe('full width', () => {
    it('should span full width when fullWidth is true', () => {
      render(<TouchButton fullWidth data-testid="btn">Full Width</TouchButton>);
      const button = screen.getByTestId('btn');
      
      expect(button).toHaveClass('fv-btn-full');
    });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<TouchButton aria-label="Submit form">Submit</TouchButton>);
      const button = screen.getByRole('button', { name: 'Submit form' });
      
      expect(button).toBeInTheDocument();
    });
    
    it('should have aria-busy when loading', () => {
      render(<TouchButton loading>Loading</TouchButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    
    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<TouchButton onClick={handleClick}>Submit</TouchButton>);
      const button = screen.getByRole('button');
      
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalled();
    });
  });
  
  describe('haptic feedback', () => {
    it('should trigger haptic feedback on touch devices', () => {
      // Mock navigator.vibrate
      const vibrateMock = jest.fn();
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateMock,
      });
      
      render(<TouchButton haptic data-testid="btn">Haptic</TouchButton>);
      
      fireEvent.click(screen.getByTestId('btn'));
      
      expect(vibrateMock).toHaveBeenCalledWith(10);
    });
  });
});

