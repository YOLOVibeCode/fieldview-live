import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SeekOverlay } from '../SeekOverlay';

describe('SeekOverlay', () => {
  const onSeek = vi.fn();
  const onTogglePause = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onSeek.mockClear();
    onTogglePause.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show buttons initially', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    expect(screen.queryByTestId('seek-overlay-buttons')).not.toBeInTheDocument();
  });

  it('shows buttons when center trigger is clicked', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();
  });

  it('dismisses when backdrop is clicked', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    // Click directly on the backdrop (not on a button)
    fireEvent.click(screen.getByTestId('seek-overlay-backdrop'));
    expect(screen.queryByTestId('seek-overlay-buttons')).not.toBeInTheDocument();
  });

  it('toggles visibility on repeated center taps', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    const trigger = screen.getByTestId('seek-overlay-trigger');

    fireEvent.click(trigger);
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    // The trigger zone is behind the backdrop when visible, so tapping trigger again
    // won't directly work. Instead, click backdrop to dismiss.
    fireEvent.click(screen.getByTestId('seek-overlay-backdrop'));
    expect(screen.queryByTestId('seek-overlay-buttons')).not.toBeInTheDocument();
  });

  it('calls onSeek with correct deltas for each button', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));

    fireEvent.click(screen.getByTestId('seek-overlay-btn--30'));
    expect(onSeek).toHaveBeenCalledWith(-30);

    fireEvent.click(screen.getByTestId('seek-overlay-btn--10'));
    expect(onSeek).toHaveBeenCalledWith(-10);

    fireEvent.click(screen.getByTestId('seek-overlay-btn--1'));
    expect(onSeek).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByTestId('seek-overlay-btn-1'));
    expect(onSeek).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTestId('seek-overlay-btn-10'));
    expect(onSeek).toHaveBeenCalledWith(10);

    fireEvent.click(screen.getByTestId('seek-overlay-btn-30'));
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('calls onTogglePause when pause button is clicked', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    fireEvent.click(screen.getByTestId('seek-overlay-btn-pause'));
    expect(onTogglePause).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('shows PLAY label when isPaused is true', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={true} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    const btn = screen.getByTestId('seek-overlay-btn-pause');
    expect(btn.textContent).toBe('PLAY');
  });

  it('shows PAUSE label when isPaused is false', () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    const btn = screen.getByTestId('seek-overlay-btn-pause');
    expect(btn.textContent).toBe('PAUSE');
  });

  it('auto-dismisses after 5 seconds of inactivity', async () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('seek-overlay-buttons')).not.toBeInTheDocument();
  });

  it('button press resets auto-dismiss timer', async () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));

    // Advance 4 seconds
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    // Press a button — should reset the timer
    fireEvent.click(screen.getByTestId('seek-overlay-btn--1'));
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    // Advance another 4 seconds (total 8s from start, but 4s from last action)
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    // Advance 1 more second (5s since last button press)
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId('seek-overlay-buttons')).not.toBeInTheDocument();
  });

  it('long press (2s) shows the overlay', async () => {
    render(
      <SeekOverlay onSeek={onSeek} onTogglePause={onTogglePause} isPaused={false} />
    );
    const zone = screen.getByTestId('seek-overlay-longpress-zone');

    fireEvent.pointerDown(zone, { button: 0 });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('seek-overlay-buttons')).toBeInTheDocument();

    fireEvent.pointerUp(zone);
  });
});
