/**
 * StreamPlayer Component Tests
 *
 * Tests provider selection (Mux vs Vidstack), prop passthrough, callbacks, overlay children.
 */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { StreamPlayer } from '../video/StreamPlayer';

const MockMuxPlayer = vi.fn((props: Record<string, unknown>) => (
  <div data-testid={(props['data-testid'] as string) ?? 'stream-player-mux'}>
    MuxPlayer
  </div>
));

const MockVidstackPlayer = vi.fn((props: Record<string, unknown> & { children?: ReactNode }) => (
  <div data-testid={(props['data-testid'] as string) ?? 'stream-player-vidstack'}>
    VidstackPlayer
    {props.children}
  </div>
));

vi.mock('../video/MuxStreamPlayer', () => ({
  MuxStreamPlayer: (props: Record<string, unknown>) => <MockMuxPlayer {...props} />,
}));

vi.mock('../video/VidstackPlayer', () => ({
  VidstackPlayer: (props: Record<string, unknown>) => <MockVidstackPlayer {...props} />,
}));

const defaultProps = {
  src: 'https://example.com/stream.m3u8',
};

describe('StreamPlayer', () => {
  beforeEach(() => {
    MockMuxPlayer.mockClear();
    MockVidstackPlayer.mockClear();
  });

  describe('provider selection', () => {
    it('should render MuxStreamPlayer when streamProvider is mux_managed and muxPlaybackId provided', () => {
      render(
        <StreamPlayer
          {...defaultProps}
          streamProvider="mux_managed"
          muxPlaybackId="abc123"
        />,
      );
      expect(screen.getByTestId('stream-player-mux')).toBeInTheDocument();
      expect(screen.queryByTestId('stream-player-vidstack')).not.toBeInTheDocument();
      const callProps = MockMuxPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.playbackId).toBe('abc123');
      expect(callProps?.autoPlay).toBe(true);
      expect(callProps?.muted).toBe(true);
    });

    it('should render VidstackPlayer when streamProvider is not mux_managed', () => {
      render(<StreamPlayer {...defaultProps} streamProvider="generic" />);
      expect(screen.getByTestId('stream-player-vidstack')).toBeInTheDocument();
      expect(screen.queryByTestId('stream-player-mux')).not.toBeInTheDocument();
      const callProps = MockVidstackPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.src).toBe('https://example.com/stream.m3u8');
      expect(callProps?.autoPlay).toBe(true);
      expect(callProps?.muted).toBe(true);
    });

    it('should render VidstackPlayer when muxPlaybackId is empty', () => {
      render(
        <StreamPlayer
          {...defaultProps}
          streamProvider="mux_managed"
          muxPlaybackId=""
        />,
      );
      expect(screen.getByTestId('stream-player-vidstack')).toBeInTheDocument();
    });
  });

  describe('prop passthrough', () => {
    it('should pass autoplay and muted to VidstackPlayer', () => {
      render(
        <StreamPlayer
          {...defaultProps}
          autoPlay={false}
          muted={false}
        />,
      );
      const callProps = MockVidstackPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.autoPlay).toBe(false);
      expect(callProps?.muted).toBe(false);
    });

    it('should pass src to VidstackPlayer', () => {
      render(<StreamPlayer src="https://custom.m3u8" />);
      const callProps = MockVidstackPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.src).toBe('https://custom.m3u8');
    });

    it('should pass playbackToken and streamType to MuxStreamPlayer', () => {
      render(
        <StreamPlayer
          {...defaultProps}
          streamProvider="mux_managed"
          muxPlaybackId="id"
          playbackToken="token"
          streamType="live"
        />,
      );
      const callProps = MockMuxPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.playbackToken).toBe('token');
      expect(callProps?.streamType).toBe('live');
    });
  });

  describe('callbacks', () => {
    it('should pass onStatusChange and onTimeUpdate to VidstackPlayer', () => {
      const onStatusChange = vi.fn();
      const onTimeUpdate = vi.fn();
      render(
        <StreamPlayer
          {...defaultProps}
          onStatusChange={onStatusChange}
          onTimeUpdate={onTimeUpdate}
        />,
      );
      const callProps = MockVidstackPlayer.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callProps?.onStatusChange).toBe(onStatusChange);
      expect(callProps?.onTimeUpdate).toBe(onTimeUpdate);
    });
  });

  describe('children overlay', () => {
    it('should render children on top of Mux player', () => {
      render(
        <StreamPlayer
          {...defaultProps}
          streamProvider="mux_managed"
          muxPlaybackId="x"
        >
          <span data-testid="overlay-child">Overlay</span>
        </StreamPlayer>,
      );
      expect(screen.getByTestId('overlay-child')).toBeInTheDocument();
      expect(screen.getByText('Overlay')).toBeInTheDocument();
    });

    it('should render children inside VidstackPlayer', () => {
      render(
        <StreamPlayer {...defaultProps}>
          <span data-testid="overlay-child">Overlay</span>
        </StreamPlayer>,
      );
      expect(screen.getByTestId('overlay-child')).toBeInTheDocument();
    });
  });

  describe('data-testid', () => {
    it('should use custom data-testid when provided', () => {
      render(
        <StreamPlayer {...defaultProps} data-testid="my-player" />,
      );
      expect(screen.getByTestId('my-player')).toBeInTheDocument();
    });
  });
});
