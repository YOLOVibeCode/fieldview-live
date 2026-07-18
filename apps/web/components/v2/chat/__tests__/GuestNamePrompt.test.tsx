import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GuestNamePrompt } from '../GuestNamePrompt';

describe('GuestNamePrompt', () => {
  const mockOnSubmit = vi.fn();
  const testSlug = 'test-slug';

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      clear: () => { store = {}; },
      removeItem: (key: string) => { delete store[key]; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Rendering', () => {
    it('should render prompt with input and button', () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('form-guest-name')).toBeInTheDocument();
      expect(screen.getByText(/what should we call you/i)).toBeInTheDocument();
      expect(screen.getByTestId('input-guest-name')).toBeInTheDocument();
      expect(screen.getByTestId('btn-join-chat')).toBeInTheDocument();
    });

    it('should render with custom data-testid', () => {
      render(
        <GuestNamePrompt
          slug={testSlug}
          onSubmit={mockOnSubmit}
          data-testid="custom-prompt"
        />
      );

      expect(screen.getByTestId('custom-prompt')).toBeInTheDocument();
    });

    it('should have empty input by default when no cached name', () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should pre-fill input from localStorage if available', () => {
      const cachedName = 'John Doe';
      localStorage.setItem(`fieldview_guest_name_${testSlug}`, cachedName);

      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name') as HTMLInputElement;
      expect(input.value).toBe(cachedName);
    });
  });

  describe('Validation', () => {
    it('should show validation error for empty name', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const button = screen.getByTestId('btn-join-chat');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-guest-name')).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show validation error for name with only whitespace', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-guest-name')).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show validation error for name > 30 chars', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      const longName = 'a'.repeat(31);
      fireEvent.change(input, { target: { value: longName } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-guest-name')).toBeInTheDocument();
        expect(screen.getByText(/30 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept name exactly 30 chars', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      const maxName = 'a'.repeat(30);
      fireEvent.change(input, { target: { value: maxName } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(maxName);
      });
    });

    it('should clear validation error when user types', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      // Trigger validation error
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('error-guest-name')).toBeInTheDocument();
      });

      // Type to clear error
      fireEvent.change(input, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.queryByTestId('error-guest-name')).not.toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should call onSubmit with trimmed name', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      fireEvent.change(input, { target: { value: '  John Doe  ' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('John Doe');
      });
    });

    it('should save name to localStorage before calling onSubmit', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const button = screen.getByTestId('btn-join-chat');

      fireEvent.change(input, { target: { value: 'Jane Smith' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(localStorage.getItem(`fieldview_guest_name_${testSlug}`)).toBe('Jane Smith');
        expect(mockOnSubmit).toHaveBeenCalledWith('Jane Smith');
      });
    });

    it('should handle form submission via Enter key', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');

      fireEvent.change(input, { target: { value: 'Alex Brown' } });
      fireEvent.submit(screen.getByTestId('form-guest-name'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Alex Brown');
      });
    });

    it('should not submit if validation fails via Enter key', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      fireEvent.submit(screen.getByTestId('form-guest-name'));

      await waitFor(() => {
        expect(screen.getByTestId('error-guest-name')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with input', () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const input = screen.getByTestId('input-guest-name');
      const label = screen.getByText(/what should we call you/i);

      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should link error message to input via aria-describedby', async () => {
      render(<GuestNamePrompt slug={testSlug} onSubmit={mockOnSubmit} />);

      const button = screen.getByTestId('btn-join-chat');
      fireEvent.click(button);

      await waitFor(() => {
        const input = screen.getByTestId('input-guest-name');
        const errorId = 'error-guest-name';
        expect(input).toHaveAttribute('aria-describedby', errorId);
        expect(screen.getByTestId(errorId)).toBeInTheDocument();
      });
    });
  });
});
