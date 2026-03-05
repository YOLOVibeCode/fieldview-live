'use client';

/**
 * SeekConfirmOverlay – confirmation overlay for large seeks; shows target time, Jump/Cancel, auto-cancels after timeout.
 */

import { useEffect, useCallback } from 'react';

export interface SeekConfirmOverlayProps {
  targetTime: number;
  onConfirm: () => void;
  onCancel: () => void;
  timeoutMs: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SeekConfirmOverlay({
  targetTime,
  onConfirm,
  onCancel,
  timeoutMs,
}: SeekConfirmOverlayProps) {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    const t = setTimeout(() => onCancel(), timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs, onCancel]);

  const label = `Jump to ${formatTime(targetTime)}?`;
  return (
    <div
      data-testid="seek-confirm-overlay"
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"
      role="presentation"
    >
      <div
        role="dialog"
        aria-label={label}
        className="rounded-lg bg-[var(--fv-color-bg-elevated,theme(colors.slate.700))] px-4 py-3 shadow-lg"
      >
        <p className="mb-3 text-sm text-white">
          Jump to <strong data-testid="seek-confirm-target-time">{formatTime(targetTime)}</strong>?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-seek-confirm"
            onClick={handleConfirm}
            className="rounded bg-[var(--fv-color-primary-500,#3B82F6)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            aria-label="Jump to position"
          >
            Jump
          </button>
          <button
            type="button"
            data-testid="btn-seek-cancel"
            onClick={handleCancel}
            className="rounded bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
            aria-label="Cancel seek"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
