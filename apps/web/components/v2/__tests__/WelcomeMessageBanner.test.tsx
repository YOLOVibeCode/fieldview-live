/**
 * WelcomeMessageBanner Component Tests
 *
 * Tests the dismissible welcome banner UI.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WelcomeMessageBanner } from '../WelcomeMessageBanner';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('WelcomeMessageBanner', () => {
  const defaultProps = {
    message: 'Hello viewers! Welcome to the stream.',
    slug: 'tchs',
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render message text', () => {
    render(<WelcomeMessageBanner {...defaultProps} />);
    expect(screen.getByText('Hello viewers! Welcome to the stream.')).toBeInTheDocument();
  });

  it('should render dismiss button', () => {
    render(<WelcomeMessageBanner {...defaultProps} />);
    expect(screen.getByTestId('btn-dismiss-welcome')).toBeInTheDocument();
  });

  it('should call onDismiss on button click', () => {
    const onDismiss = vi.fn();
    render(<WelcomeMessageBanner {...defaultProps} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('btn-dismiss-welcome'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should write message to localStorage on dismiss', () => {
    render(<WelcomeMessageBanner {...defaultProps} />);

    fireEvent.click(screen.getByTestId('btn-dismiss-welcome'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'welcome-dismissed-tchs',
      'Hello viewers! Welcome to the stream.',
    );
  });

  it('should have correct aria attributes', () => {
    render(<WelcomeMessageBanner {...defaultProps} />);

    const banner = screen.getByTestId('welcome-message-banner');
    expect(banner).toHaveAttribute('role', 'region');
    expect(banner).toHaveAttribute('aria-label', 'Welcome message');
  });
});
