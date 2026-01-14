/**
 * ChatMessage Component Tests
 * 
 * TDD: Individual message bubble with avatar and timestamp
 */

import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

describe('ChatMessage', () => {
  const defaultProps = {
    id: 'msg-1',
    userName: 'John Doe',
    userColor: '#3B82F6',
    message: 'Hello everyone!',
    timestamp: new Date('2026-01-13T12:00:00Z'),
  };
  
  describe('rendering', () => {
    it('should render user name', () => {
      render(<ChatMessage {...defaultProps} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    it('should render message text', () => {
      render(<ChatMessage {...defaultProps} />);
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    });
    
    it('should render timestamp', () => {
      render(<ChatMessage {...defaultProps} />);
      // Should show time like "12:00 PM"
      expect(screen.getByText(/12:00/)).toBeInTheDocument();
    });
    
    it('should apply user color to avatar', () => {
      render(<ChatMessage {...defaultProps} data-testid="chat-message" />);
      const avatar = screen.getByTestId('chat-avatar');
      expect(avatar.style.backgroundColor).toBe('rgb(59, 130, 246)'); // #3B82F6
    });
  });
  
  describe('avatar', () => {
    it('should show user initials', () => {
      render(<ChatMessage {...defaultProps} />);
      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe → JD
    });
    
    it('should handle single name', () => {
      render(<ChatMessage {...defaultProps} userName="Alice" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });
    
    it('should handle multi-word names', () => {
      render(<ChatMessage {...defaultProps} userName="Alice Bob Carol" />);
      expect(screen.getByText('AB')).toBeInTheDocument(); // First two words
    });
  });
  
  describe('variants', () => {
    it('should render system message', () => {
      render(<ChatMessage {...defaultProps} isSystem data-testid="chat-message" />);
      const message = screen.getByTestId('chat-message');
      expect(message).toHaveClass('system');
    });
    
    it('should render own message', () => {
      render(<ChatMessage {...defaultProps} isOwn data-testid="chat-message" />);
      const message = screen.getByTestId('chat-message');
      expect(message).toHaveClass('own');
    });
    
    it('should render compact variant', () => {
      render(<ChatMessage {...defaultProps} variant="compact" data-testid="chat-message" />);
      const message = screen.getByTestId('chat-message');
      expect(message).toHaveClass('compact');
    });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA role', () => {
      render(<ChatMessage {...defaultProps} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
    
    it('should have aria-label with user and time', () => {
      render(<ChatMessage {...defaultProps} />);
      expect(screen.getByLabelText(/John Doe.*12:00/)).toBeInTheDocument();
    });
  });
  
  describe('long messages', () => {
    it('should wrap long text', () => {
      const longMessage = 'This is a very long message '.repeat(10);
      render(<ChatMessage {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});

