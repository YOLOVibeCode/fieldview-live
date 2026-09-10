/**
 * useVideoElementReady — dismiss loading chrome when the <video> can play
 * even if the wrapper player never emits onStatusChange('playing').
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRef, type RefObject } from 'react';
import { useVideoElementReady } from '../useVideoElementReady';

function renderWithContainer(
  enabled: boolean,
  onReady: () => void,
  sourceKey?: string | null,
): { container: HTMLDivElement; rerender: (enabled: boolean) => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { rerender } = renderHook(
    ({ enabled: nextEnabled }) => {
      const ref = useRef<HTMLElement | null>(container);
      useVideoElementReady(ref as RefObject<HTMLElement | null>, nextEnabled, onReady, sourceKey);
    },
    { initialProps: { enabled } },
  );
  return {
    container,
    rerender: (nextEnabled: boolean) => rerender({ enabled: nextEnabled }),
  };
}

describe('useVideoElementReady', () => {
  it('calls onReady when a video inside the container fires canplay', async () => {
    const onReady = vi.fn();
    const { container } = renderWithContainer(true, onReady, 'https://example.com/a.m3u8');
    const video = document.createElement('video');
    container.appendChild(video);

    act(() => {
      video.dispatchEvent(new Event('canplay', { bubbles: true }));
    });

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it('does not call onReady when disabled', async () => {
    const onReady = vi.fn();
    const { container } = renderWithContainer(false, onReady, 'https://example.com/a.m3u8');
    const video = document.createElement('video');
    container.appendChild(video);

    act(() => {
      video.dispatchEvent(new Event('canplay', { bubbles: true }));
    });

    expect(onReady).not.toHaveBeenCalled();
  });

  it('calls onReady once even if canplay fires repeatedly', async () => {
    const onReady = vi.fn();
    const { container } = renderWithContainer(true, onReady, 'https://example.com/a.m3u8');
    const video = document.createElement('video');
    container.appendChild(video);

    act(() => {
      video.dispatchEvent(new Event('canplay', { bubbles: true }));
      video.dispatchEvent(new Event('playing', { bubbles: true }));
    });

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });
});
