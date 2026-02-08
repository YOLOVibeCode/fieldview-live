'use client';

/**
 * SeekButtons - Skip forward/backward buttons for the Vidstack player.
 *
 * Renders +-10s skip buttons (like YouTube/Netflix).
 * Used as slot content in the DefaultVideoLayout.
 */

import { SeekButton } from '@vidstack/react';

export function SeekBackwardButton() {
  return (
    <SeekButton
      seconds={-10}
      className="vds-button vds-seek-button"
      aria-label="Seek backward 10 seconds"
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11.5 19a7.5 7.5 0 1 0 0-15" />
        <polyline points="11.5 4 7.5 4 7.5 8" />
        <text
          x="12"
          y="14.5"
          fill="currentColor"
          stroke="none"
          fontSize="7"
          fontWeight="bold"
          textAnchor="middle"
        >
          10
        </text>
      </svg>
    </SeekButton>
  );
}

export function SeekForwardButton() {
  return (
    <SeekButton
      seconds={10}
      className="vds-button vds-seek-button"
      aria-label="Seek forward 10 seconds"
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.5 5a7.5 7.5 0 1 1 0 15" />
        <polyline points="12.5 4 16.5 4 16.5 8" />
        <text
          x="12"
          y="14.5"
          fill="currentColor"
          stroke="none"
          fontSize="7"
          fontWeight="bold"
          textAnchor="middle"
        >
          10
        </text>
      </svg>
    </SeekButton>
  );
}
