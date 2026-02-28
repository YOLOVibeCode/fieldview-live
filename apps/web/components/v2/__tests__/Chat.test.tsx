/**
 * Chat Component Tests
 *
 * Tests message list, onSend, disabled/loading states, mode variants, data-testid.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Chat } from '../chat/Chat';
import type { ChatMessageData } from '../chat/ChatMessageList';

const mockMessages: ChatMessageData[] = [
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

describe('Chat', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  describe('rendering', () => {
    it('should render message list and input', () => {
      render(<Chat messages={mockMessages} onSend={() => {}} />);
      expect(screen.getByTestId('chat-message-list')).toBeInTheDocument();
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

    it('should use custom data-testid when provided', () => {
      render(<Chat messages={[]} onSend={() => {}} data-testid="my-chat" />);
      expect(screen.getByTestId('my-chat')).toBeInTheDocument();
    });
  });

  describe('onSend', () => {
    it('should call onSend with message on submit', async () => {
      const onSend = vi.fn();
      render(<Chat messages={[]} onSend={onSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      fireEvent.change(input, { target: { value: 'New message' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('New message');
      });
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled', () => {
      render(<Chat messages={[]} onSend={() => {}} disabled />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner/skeletons', () => {
      render(<Chat messages={[]} onSend={() => {}} isLoading />);
      expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      render(<Chat messages={[]} onSend={() => {}} isLoading />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });

  describe('empty message', () => {
    it('should show default empty message', () => {
      render(<Chat messages={[]} onSend={() => {}} />);
      expect(screen.getByTestId('chat-empty')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(<Chat messages={[]} onSend={() => {}} emptyMessage="Start chatting!" />);
      expect(screen.getByText('Start chatting!')).toBeInTheDocument();
    });
  });

  describe('mode variants', () => {
    it('should render floating mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="floating" data-testid="chat" />);
      expect(screen.getByTestId('chat')).toHaveClass('floating');
    });

    it('should render sidebar mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="sidebar" data-testid="chat" />);
      expect(screen.getByTestId('chat')).toHaveClass('sidebar');
    });

    it('should render embedded mode', () => {
      render(<Chat messages={[]} onSend={() => {}} mode="embedded" data-testid="chat" />);
      expect(screen.getByTestId('chat')).toHaveClass('embedded');
    });
  });

  describe('accessibility', () => {
    it('should have role region and aria-label', () => {
      render(<Chat messages={[]} onSend={() => {}} />);
      expect(screen.getByRole('region', { name: /chat/i })).toBeInTheDocument();
    });
  });
});
