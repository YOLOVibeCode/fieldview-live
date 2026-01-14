/**
 * ChatInput Component Tests
 * 
 * TDD: Message input with send button
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  describe('rendering', () => {
    it('should render input field', () => {
      render(<ChatInput onSend={() => {}} />);
      expect(screen.getByPlaceholderText(/type.*message/i)).toBeInTheDocument();
    });
    
    it('should render send button', () => {
      render(<ChatInput onSend={() => {}} />);
      expect(screen.getByLabelText(/send message/i)).toBeInTheDocument();
    });
    
    it('should have custom placeholder', () => {
      render(<ChatInput onSend={() => {}} placeholder="Say something..." />);
      expect(screen.getByPlaceholderText('Say something...')).toBeInTheDocument();
    });
  });
  
  describe('input behavior', () => {
    it('should allow typing', () => {
      render(<ChatInput onSend={() => {}} />);
      const input = screen.getByPlaceholderText(/type.*message/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      expect(input.value).toBe('Hello');
    });
    
    it('should clear input after sending', async () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
    
    it('should not send empty messages', () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      expect(handleSend).not.toHaveBeenCalled();
    });
    
    it('should not send whitespace-only messages', () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      expect(handleSend).not.toHaveBeenCalled();
    });
  });
  
  describe('send action', () => {
    it('should call onSend with message', async () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      fireEvent.change(input, { target: { value: 'Hello world' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      await waitFor(() => {
        expect(handleSend).toHaveBeenCalledWith('Hello world');
      });
    });
    
    it('should trim message before sending', async () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      fireEvent.change(input, { target: { value: '  Hello  ' } });
      fireEvent.click(screen.getByLabelText(/send message/i));
      
      await waitFor(() => {
        expect(handleSend).toHaveBeenCalledWith('Hello');
      });
    });
    
    it('should send on Enter key', async () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(handleSend).toHaveBeenCalledWith('Hello');
      });
    });
    
    it('should not send on Shift+Enter', () => {
      const handleSend = jest.fn();
      render(<ChatInput onSend={handleSend} />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      
      expect(handleSend).not.toHaveBeenCalled();
    });
  });
  
  describe('disabled state', () => {
    it('should disable input when disabled', () => {
      render(<ChatInput onSend={() => {}} disabled />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
    
    it('should disable send button when disabled', () => {
      render(<ChatInput onSend={() => {}} disabled />);
      const button = screen.getByLabelText(/send message/i);
      expect(button).toBeDisabled();
    });
  });
  
  describe('loading state', () => {
    it('should show loading state', () => {
      render(<ChatInput onSend={() => {}} isLoading />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Spinner
    });
    
    it('should disable input when loading', () => {
      render(<ChatInput onSend={() => {}} isLoading />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      expect(input).toBeDisabled();
    });
  });
  
  describe('max length', () => {
    it('should enforce max length', () => {
      render(<ChatInput onSend={() => {}} maxLength={10} />);
      const input = screen.getByPlaceholderText(/type.*message/i) as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'Hello world this is long' } });
      
      // Browser enforces maxLength, so this should be truncated
      expect(input.value.length).toBeLessThanOrEqual(10);
    });
  });
  
  describe('accessibility', () => {
    it('should have proper ARIA label on input', () => {
      render(<ChatInput onSend={() => {}} />);
      expect(screen.getByLabelText(/message input/i)).toBeInTheDocument();
    });
    
    it('should focus input on mount', async () => {
      render(<ChatInput onSend={() => {}} autoFocus />);
      const input = screen.getByPlaceholderText(/type.*message/i);
      
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });
});

