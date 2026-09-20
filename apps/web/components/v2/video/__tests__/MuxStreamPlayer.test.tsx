import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MuxStreamPlayer } from '../MuxStreamPlayer';

function mockSeekable(ranges: Array<{ start: number; end: number }>): TimeRanges {
  return {
    length: ranges.length,
    start: (i: number) => ranges[i]?.start ?? 0,
    end: (i: number) => ranges[i]?.end ?? 0,
  } as TimeRanges;
}

const mediaState = {
  currentTime: 5000,
  seekable: mockSeekable([{ start: 120, end: 5100 }]),
  duration: Number.POSITIVE_INFINITY,
};

vi.mock('@mux/mux-player-react', () => ({
  default: forwardRef(function MockMuxPlayer(
    props: {
      onTimeUpdate?: (e: Event) => void;
      streamType?: string;
      children?: ReactNode;
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({
      get currentTime() {
        return mediaState.currentTime;
      },
      set currentTime(value: number) {
        mediaState.currentTime = value;
      },
      paused: false,
      play: vi.fn(),
      pause: vi.fn(),
    }));

    useEffect(() => {
      props.onTimeUpdate?.({ target: mediaState } as unknown as Event);
    }, [props]);

    return (
      <div data-testid="mock-mux" data-stream-type={props.streamType} />
    );
  }),
}));

describe('MuxStreamPlayer seek overlay', () => {
  beforeEach(() => {
    mediaState.currentTime = 5000;
    mediaState.seekable = mockSeekable([{ start: 120, end: 5100 }]);
  });

  it('passes live:dvr streamType to Mux element', () => {
    render(<MuxStreamPlayer playbackId="pid" streamType="live:dvr" />);
    expect(screen.getByTestId('mock-mux')).toHaveAttribute(
      'data-stream-type',
      'live:dvr'
    );
  });

  it('seeks -30s within seekable range', async () => {
    const user = userEvent.setup();
    render(<MuxStreamPlayer playbackId="pid" streamType="live:dvr" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn--30'));
    expect(mediaState.currentTime).toBe(4970);
  });

  it('go-to-start uses seekable start not zero', async () => {
    const user = userEvent.setup();
    render(<MuxStreamPlayer playbackId="pid" streamType="live:dvr" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn-start'));
    expect(mediaState.currentTime).toBe(120);
  });

  it('go-live seeks to seekable end', async () => {
    const user = userEvent.setup();
    render(<MuxStreamPlayer playbackId="pid" streamType="live:dvr" />);
    await user.click(screen.getByTestId('seek-overlay-trigger'));
    await user.click(screen.getByTestId('seek-overlay-btn-live'));
    expect(mediaState.currentTime).toBe(5100);
  });
});
