import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SeekOverlay } from '../SeekOverlay';

describe('SeekOverlay', () => {
  const onSeek = vi.fn();
  const onTogglePause = vi.fn();
  const onGoToStart = vi.fn();
  const onGoLive = vi.fn();

  const defaultProps = {
    onSeek,
    onTogglePause,
    onGoToStart,
    onGoLive,
    isPaused: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    onSeek.mockClear();
    onTogglePause.mockClear();
    onGoToStart.mockClear();
    onGoLive.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Helper: the backdrop has opacity-0 when hidden, opacity-100 when visible */
  function expectHidden() {
    const backdrop = screen.getByTestId('seek-overlay-backdrop');
    expect(backdrop.className).toContain('opacity-0');
  }

  function expectVisible() {
    const backdrop = screen.getByTestId('seek-overlay-backdrop');
    expect(backdrop.className).toContain('opacity-100');
  }

  it('starts hidden (opacity-0)', () => {
    render(<SeekOverlay {...defaultProps} />);
    expectHidden();
  });

  it('shows buttons when center trigger is clicked', () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expectVisible();
  });

  it('dismisses when backdrop is clicked', () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expectVisible();

    fireEvent.click(screen.getByTestId('seek-overlay-backdrop'));
    expectHidden();
  });

  it('toggles visibility on repeated center taps and backdrop clicks', () => {
    render(<SeekOverlay {...defaultProps} />);
    const trigger = screen.getByTestId('seek-overlay-trigger');

    fireEvent.click(trigger);
    expectVisible();

    fireEvent.click(screen.getByTestId('seek-overlay-backdrop'));
    expectHidden();
  });

  it('renders all 9 segment buttons', () => {
    render(<SeekOverlay {...defaultProps} />);
    expect(screen.getByTestId('seek-overlay-btn-start')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn--30')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn--10')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn--1')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn-pause')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn-10')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn-30')).toBeInTheDocument();
    expect(screen.getByTestId('seek-overlay-btn-live')).toBeInTheDocument();
  });

  it('calls onSeek with correct deltas for seek buttons', () => {
    render(<SeekOverlay {...defaultProps} />);
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
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    fireEvent.click(screen.getByTestId('seek-overlay-btn-pause'));
    expect(onTogglePause).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('calls onGoToStart when start button is clicked', () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    fireEvent.click(screen.getByTestId('seek-overlay-btn-start'));
    expect(onGoToStart).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('calls onGoLive when live button is clicked', () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    fireEvent.click(screen.getByTestId('seek-overlay-btn-live'));
    expect(onGoLive).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('pause button has aria-label "Play" when isPaused is true', () => {
    render(<SeekOverlay {...defaultProps} isPaused={true} />);
    const btn = screen.getByTestId('seek-overlay-btn-pause');
    expect(btn.getAttribute('aria-label')).toBe('Play');
  });

  it('pause button has aria-label "Pause" when isPaused is false', () => {
    render(<SeekOverlay {...defaultProps} isPaused={false} />);
    const btn = screen.getByTestId('seek-overlay-btn-pause');
    expect(btn.getAttribute('aria-label')).toBe('Pause');
  });

  it('auto-dismisses after 3 seconds of inactivity', async () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));
    expectVisible();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expectHidden();
  });

  it('button press resets auto-dismiss timer', async () => {
    render(<SeekOverlay {...defaultProps} />);
    fireEvent.click(screen.getByTestId('seek-overlay-trigger'));

    // Advance 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    // Press a button - should reset the timer
    fireEvent.click(screen.getByTestId('seek-overlay-btn--1'));
    expectVisible();

    // Advance 2.5 seconds (not yet 3s since last action)
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expectVisible();

    // Advance 0.5 more seconds (3s since last button press)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expectHidden();
  });

  it('long press (2s) shows the overlay', async () => {
    render(<SeekOverlay {...defaultProps} />);
    const zone = screen.getByTestId('seek-overlay-longpress-zone');

    fireEvent.pointerDown(zone, { button: 0 });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expectVisible();

    fireEvent.pointerUp(zone);
  });

  it('pointer-events-none on root container by default', () => {
    render(<SeekOverlay {...defaultProps} />);
    const root = screen.getByTestId('seek-overlay-root');
    expect(root.className).toContain('pointer-events-none');
  });

  it('long-press zone excludes bottom 60px for native controls', () => {
    render(<SeekOverlay {...defaultProps} />);
    const zone = screen.getByTestId('seek-overlay-longpress-zone');
    expect(zone.className).toContain('bottom-[60px]');
  });
});
