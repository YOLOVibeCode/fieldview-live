/**
 * Header Component Tests
 * 
 * TDD: Sticky navigation header for all screen sizes
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

describe('Header', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      render(<Header title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
    
    it('should render with subtitle', () => {
      render(<Header title="Title" subtitle="Subtitle" />);
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });
    
    it('should be sticky by default', () => {
      render(<Header title="Title" data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('sticky');
    });
  });
  
  describe('back button', () => {
    it('should show back button when onBack is provided', () => {
      render(<Header title="Title" onBack={() => {}} />);
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });
    
    it('should call onBack when clicked', () => {
      const handleBack = jest.fn();
      render(<Header title="Title" onBack={handleBack} />);
      
      fireEvent.click(screen.getByLabelText('Go back'));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
    
    it('should not show back button when onBack is not provided', () => {
      render(<Header title="Title" />);
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });
  });
  
  describe('menu button', () => {
    it('should show menu button when onMenu is provided', () => {
      render(<Header title="Title" onMenu={() => {}} />);
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });
    
    it('should call onMenu when clicked', () => {
      const handleMenu = jest.fn();
      render(<Header title="Title" onMenu={handleMenu} />);
      
      fireEvent.click(screen.getByLabelText('Open menu'));
      expect(handleMenu).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('right action', () => {
    it('should render custom right action', () => {
      render(
        <Header
          title="Title"
          rightAction={<button>Custom</button>}
        />
      );
      
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });
  
  describe('transparency', () => {
    it('should apply transparent styles when transparent prop is true', () => {
      render(<Header title="Title" transparent data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('bg-transparent');
    });
    
    it('should have solid background by default', () => {
      render(<Header title="Title" data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).not.toHaveClass('bg-transparent');
    });
  });
  
  describe('accessibility', () => {
    it('should have banner role', () => {
      render(<Header title="Title" />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
    
    it('should have proper heading hierarchy', () => {
      render(<Header title="Main Title" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Main Title');
    });
  });
  
  describe('safe area', () => {
    it('should have safe area padding by default', () => {
      render(<Header title="Title" data-testid="header" />);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('fv-safe-area-top');
    });
  });
});

