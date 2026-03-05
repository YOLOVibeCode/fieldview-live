/**
 * SafeTimeSlider: intercepts large seeks and shows confirmation; small seeks pass through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const mockSeek = vi.fn();
const mockEl = document.createElement('div');
let mockCurrentTime = 100;
let mockDuration = 600;

vi.mock('@vidstack/react', () => ({
  useMediaPlayer: () => ({ $el: mockEl }),
  useMediaState: (key: string) => (key === 'currentTime' ? mockCurrentTime : mockDuration),
  useMediaRemote: () => ({ seek: mockSeek }),
  TimeSlider: {
    Root: ({ children, ...p }: { children?: React.ReactNode } & Record<string, unknown>) => (
      <div data-testid="time-slider-root" {...p}>
        {children}
      </div>
    ),
    Track: ({ children }: { children: React.ReactNode }) => <div data-testid="track">{children}</div>,
    TrackFill: () => <div data-testid="track-fill" />,
    Progress: () => <div data-testid="progress" />,
    Thumb: () => <div data-testid="thumb" />,
    Preview: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="preview">{children}</div>
    ),
    Value: () => <span data-testid="value">0:00</span>,
  },
}));

// Import after mocks
import { SafeTimeSlider } from '../SafeTimeSlider';

function dispatchSeekRequest(detail: number) {
  mockEl.dispatchEvent(
    new CustomEvent('media-seek-request', { detail, bubbles: true, composed: true })
  );
}

describe('SafeTimeSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentTime = 100;
    mockDuration = 600;
  });

  it('allows small seeks without confirmation', () => {
    render(<SafeTimeSlider />);
    act(() => {
      dispatchSeekRequest(105);
    });
    expect(screen.queryByTestId('seek-confirm-overlay')).not.toBeInTheDocument();
  });

  it('shows confirmation overlay for large seeks', async () => {
    render(<SafeTimeSlider />);
    await act(async () => {
      dispatchSeekRequest(0);
    });
    expect(screen.getByTestId('seek-confirm-overlay')).toBeInTheDocument();
  });

  it('reverts position on cancel', async () => {
    render(<SafeTimeSlider />);
    await act(async () => {
      dispatchSeekRequest(0);
    });
    expect(screen.getByTestId('seek-confirm-overlay')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-seek-cancel'));
    expect(screen.queryByTestId('seek-confirm-overlay')).not.toBeInTheDocument();
    expect(mockSeek).not.toHaveBeenCalled();
  });

  it('commits position on confirm', async () => {
    render(<SafeTimeSlider />);
    await act(async () => {
      dispatchSeekRequest(0);
    });
    fireEvent.click(screen.getByTestId('btn-seek-confirm'));
    expect(mockSeek).toHaveBeenCalledWith(0);
    expect(screen.queryByTestId('seek-confirm-overlay')).not.toBeInTheDocument();
  });
});
