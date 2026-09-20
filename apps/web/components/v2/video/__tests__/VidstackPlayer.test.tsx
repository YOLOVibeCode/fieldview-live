import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VidstackPlayer } from '../VidstackPlayer';

const playerState = {
  currentTime: 5000,
  duration: Number.POSITIVE_INFINITY,
  paused: false,
  seekable: {
    length: 1,
    start: () => 120,
    end: () => 5100,
  } as TimeRanges,
};

vi.mock('@vidstack/react', () => ({
  MediaPlayer: forwardRef(function MockMediaPlayer(
    props: { children?: ReactNode; 'data-testid'?: string },
    ref
  ) {
    useImperativeHandle(ref, () => ({
      get currentTime() {
        return playerState.currentTime;
      },
      set currentTime(value: number) {
        playerState.currentTime = value;
      },
      get duration() {
        return playerState.duration;
      },
      get seekable() {
        return playerState.seekable;
      },
      paused: playerState.paused,
      play: vi.fn(),
      pause: vi.fn(),
    }));
    return (
      <div data-testid={props['data-testid'] ?? 'vidstack-player-mock'}>
        {props.children}
      </div>
    );
  }),
  MediaProvider: () => null,
  useMediaState: (key: string) => {
    if (key === 'currentTime') return playerState.currentTime;
    if (key === 'duration') return playerState.duration;
    if (key === 'seekableStart') return 120;
    if (key === 'seekableEnd') return 5100;
    return 0;
  },
  useMediaRemote: () => ({ seek: (t: number) => { playerState.currentTime = t; } }),
}));

vi.mock('@vidstack/react/player/layouts/default', () => ({
  DefaultVideoLayout: () => null,
  defaultLayoutIcons: {},
}));

describe('VidstackPlayer seek overlay', () => {
  beforeEach(() => {
    playerState.currentTime = 5000;
  });

  it('seeks -30s within seekable range', async () => {
    const user = userEvent.setup();
    render(<VidstackPlayer src="https://example.com/live.m3u8" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn--30'));
    expect(playerState.currentTime).toBe(4970);
  });

  it('go-to-start uses seekable start', async () => {
    const user = userEvent.setup();
    render(<VidstackPlayer src="https://example.com/live.m3u8" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn-start'));
    expect(playerState.currentTime).toBe(120);
  });

  it('go-live seeks to finite seekable end', async () => {
    const user = userEvent.setup();
    render(<VidstackPlayer src="https://example.com/live.m3u8" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn-live'));
    expect(playerState.currentTime).toBe(5100);
    expect(Number.isFinite(playerState.currentTime)).toBe(true);
  });
});
