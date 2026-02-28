/**
 * isWelcomeDismissed Utility Tests
 *
 * Tests the localStorage-based dismiss detection logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isWelcomeDismissed } from '../WelcomeMessageBanner';

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

describe('isWelcomeDismissed', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return false when no stored value', () => {
    expect(isWelcomeDismissed('tchs', 'Hello')).toBe(false);
  });

  it('should return false when stored value differs from current message', () => {
    localStorageMock.setItem('welcome-dismissed-tchs', 'Old message');
    expect(isWelcomeDismissed('tchs', 'New message')).toBe(false);
  });

  it('should return true when stored value matches current message', () => {
    localStorageMock.setItem('welcome-dismissed-tchs', 'Hello viewers');
    expect(isWelcomeDismissed('tchs', 'Hello viewers')).toBe(true);
  });

  it('should return false when window is undefined (SSR)', () => {
    // Save original window
    const originalWindow = globalThis.window;
    // @ts-ignore - simulate SSR
    delete (globalThis as any).window;

    expect(isWelcomeDismissed('tchs', 'Hello')).toBe(false);

    // Restore
    globalThis.window = originalWindow;
  });
});
