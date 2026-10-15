'use client';

/**
 * One-time first-visit tip: hold the video to skip/rewind/go live.
 * Stored in localStorage so it only appears until dismissed.
 */

import { useCallback, useEffect, useState } from 'react';

export const SEEK_HOLD_HINT_KEY = 'fv_seek_hold_hint_seen';

export function SeekHoldHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEK_HOLD_HINT_KEY) === 'true') return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(SEEK_HOLD_HINT_KEY, 'true');
    } catch {
      // ignore quota / private-mode
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="seek-hold-hint-title"
      aria-describedby="seek-hold-hint-body"
      data-testid="hint-seek-hold-first"
      className="absolute inset-x-3 bottom-16 z-30 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 p-4 shadow-lg"
    >
      <p id="seek-hold-hint-title" className="text-white text-sm font-semibold">
        Hold the video for a couple of seconds
      </p>
      <p id="seek-hold-hint-body" className="mt-1 text-white/80 text-sm">
        Skip forward, rewind, or jump back to live.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 min-h-[44px] px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium"
        data-testid="btn-dismiss-seek-hold-hint"
        aria-label="Got it, dismiss skip instructions"
      >
        Got it
      </button>
    </div>
  );
}
