import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SEEK_HOLD_HINT_KEY, SeekHoldHint } from '../SeekHoldHint';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('SeekHoldHint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('shows first-visit skip instructions when not seen before', async () => {
    render(<SeekHoldHint />);
    const hint = await screen.findByTestId('hint-seek-hold-first');
    expect(hint).toHaveTextContent(/hold the video for a couple of seconds/i);
    expect(hint).toHaveTextContent(/skip forward/i);
    expect(hint).toHaveTextContent(/rewind/i);
    expect(hint).toHaveTextContent(/live/i);
  });

  it('does not show after it has been seen', async () => {
    localStorageMock.setItem(SEEK_HOLD_HINT_KEY, 'true');
    render(<SeekHoldHint />);
    await Promise.resolve();
    expect(screen.queryByTestId('hint-seek-hold-first')).not.toBeInTheDocument();
  });

  it('dismisses and does not show again', async () => {
    const { unmount } = render(<SeekHoldHint />);
    fireEvent.click(await screen.findByTestId('btn-dismiss-seek-hold-hint'));
    expect(screen.queryByTestId('hint-seek-hold-first')).not.toBeInTheDocument();
    expect(localStorageMock.getItem(SEEK_HOLD_HINT_KEY)).toBe('true');

    unmount();
    render(<SeekHoldHint />);
    expect(screen.queryByTestId('hint-seek-hold-first')).not.toBeInTheDocument();
  });
});
