/**
 * Chat Component Tests
 * 
 * TDD: Main chat component orchestrating messages and input
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Chat } from '../Chat';

describe('Chat', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      userName: 'Alice',
      userId: 'user-1',
      userColor: '#3B82F6',
      message: 'Hello!',
      timestamp: new Date('2026-01-13T12:00:00Z'),
    },
    {
      id: 'msg-2',
      userName: 'Bob',
      userId: 'user-2',
      userColor: '#EF4444',
      message: 'Hi there!',
      timestamp: new Date('2026-01-13T12:01:00Z'),
    },
  ];
  
  describe('rendering', () => {
    it('should render message list', () => {
      render(<Chat messages={mockMessages} onSend={() => {}} />);
      expect(screen.getByTestId('chat-message-list')).toBeInTheDocument();
    });
    
    it('should render input', () => {
      render(<Chat messages={mockMessages} onSend={() => {}} />);
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
    
    it('should render all messages', () => {
      render(<Chat messages={mockMessages} onSend={() => {}} />);
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
    
    it('should have custom title', () => {
      render(<Chat messages={mockMessages} onSend={() => {}} title="Team Chat" />);
      expect(screen.getByText('Team Chat')).toBeInTheDocument();
    });
  });
  
  describe('sending messages', () => {
    it('should call onSend with message', async () => {
      const handleSend = jest.fn();
      render(<Chat messages={[]} onSend={handleSend} />);
      
      const input = screen.getByPlaceholderText(/type.*message/i);
      fireEvent.change(input, { target: { value: 'New message' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      await waitFor(() => {
        expect(handleSend).toHaveBeenCalledWith('New message');
      });
    });
  });
  
  describe('modes', () => {
    it('should render floating mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="floating" data-testid="chat" />);
      const chat = screen.getByTestId('chat');
      expect(chat).toHaveClass('floating');
    });
    
    it('should render sidebar mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="sidebar" data-testid="chat" />);
      const chat = screen.getByTestId('chat');
      expect(chat).toHaveClass('sidebar');
    });
    
    it('should render embedded mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="embedded" data-testid="chat" />);
      const chat = screen.getByTestId('chat');
      expect(chat).toHaveClass('embedded');
    });
  });
  
  describe('empty state', () => {
    it('should show empty message', () => {
      render(<Chat messages={[]} onSend={() => {}} />);
      expect(screen.getByTestId('chat-empty')).toBeInTheDocument();
    });
    
    it('should show custom empty message', () => {
      render(<Chat messages={[]} onSend={() => {}} emptyMessage="Start chatting!" />);
      expect(screen.getByText('Start chatting!')).toBeInTheDocument();
    });
  });
  
  describe('loading state', () => {
    it('should show loading skeletons', () => {
      render(<Chat messages={[]} onSend={() => {}} isLoading />);
      expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
    });
    
    it('should disable input when loading', () => {
      render(<Chat messages={[]} onSend={() => {}} isLoading />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });
  
  describe('disabled state', () => {
    it('should disable input when disabled', () => {
      render(<Chat messages={[]} onSend={() => {}} disabled />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });
  
  describe('accessibility', () => {
    it('should have proper region role', () => {
      render(<Chat messages={[]} onSend={() => {}} />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
    
    it('should have aria-label', () => {
      render(<Chat messages={[]} onSend={() => {}} />);
      expect(screen.getByLabelText(/chat/i)).toBeInTheDocument();
    });
  });
});

