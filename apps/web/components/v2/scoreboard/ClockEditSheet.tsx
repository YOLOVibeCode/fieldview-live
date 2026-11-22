/**
 * ClockEditSheet — sideline sets the match clock to the linesman time.
 * Steppers are sized for a phone on the touchline. Save runs the clock from that time.
 */

'use client';

import { useEffect, useState } from 'react';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';

export interface ClockEditSheetProps {
  isOpen: boolean;
  currentTime?: string;
  onSave: (clockSeconds: number) => void | Promise<void>;
  onClose: () => void;
}

const MAX_MINUTES = 99;

function splitTime(currentTime?: string): { minutes: number; seconds: number } {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(currentTime ?? '');
  if (!match) return { minutes: 0, seconds: 0 };
  return { minutes: Number(match[1]), seconds: Number(match[2]) };
}

export function ClockEditSheet({ isOpen, currentTime, onSave, onClose }: ClockEditSheetProps) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const next = splitTime(currentTime);
    setMinutes(next.minutes);
    setSeconds(next.seconds);
    setError(null);
  }, [isOpen, currentTime]);

  const shift = (deltaSeconds: number) => {
    const total = Math.min(MAX_MINUTES * 60 + 59, Math.max(0, minutes * 60 + seconds + deltaSeconds));
    setMinutes(Math.floor(total / 60));
    setSeconds(total % 60);
  };

  const onDigits = (raw: string, max: number, apply: (n: number) => void) => {
    if (!/^\d{0,2}$/.test(raw)) return;
    apply(Math.min(max, raw === '' ? 0 : Number(raw)));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onSave(minutes * 60 + seconds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set clock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.55]}
      initialSnap={0}
      enableDrag
      enableBackdrop
      aria-labelledby="clock-edit-title"
    >
      <div className="space-y-5" data-testid="sheet-clock-edit">
        <div className="text-center">
          <h2 id="clock-edit-title" className="text-2xl font-bold text-[var(--fv-color-text-primary)]">
            Match clock
          </h2>
          <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
            Ask the linesman, then set that time. The clock runs from there.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <input
            data-testid="input-clock-minutes"
            aria-label="Minutes"
            inputMode="numeric"
            type="number"
            min={0}
            max={MAX_MINUTES}
            value={minutes}
            onChange={(e) => onDigits(e.target.value, MAX_MINUTES, setMinutes)}
            className="w-24 h-20 text-5xl font-mono font-bold text-center rounded-xl border-2 border-[var(--fv-color-border)] bg-[var(--fv-color-bg-elevated)]"
          />
          <span className="text-4xl font-bold" aria-hidden>:</span>
          <input
            data-testid="input-clock-seconds"
            aria-label="Seconds"
            inputMode="numeric"
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => onDigits(e.target.value, 59, setSeconds)}
            className="w-24 h-20 text-5xl font-mono font-bold text-center rounded-xl border-2 border-[var(--fv-color-border)] bg-[var(--fv-color-bg-elevated)]"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <TouchButton type="button" variant="secondary" data-testid="btn-clock-minus-minute" aria-label="Minus one minute" onClick={() => shift(-60)}>-1:00</TouchButton>
          <TouchButton type="button" variant="secondary" data-testid="btn-clock-minus-ten" aria-label="Minus ten seconds" onClick={() => shift(-10)}>-0:10</TouchButton>
          <TouchButton type="button" variant="secondary" data-testid="btn-clock-plus-ten" aria-label="Plus ten seconds" onClick={() => shift(10)}>+0:10</TouchButton>
          <TouchButton type="button" variant="secondary" data-testid="btn-clock-plus-minute" aria-label="Plus one minute" onClick={() => shift(60)}>+1:00</TouchButton>
        </div>

        {error && (
          <p data-testid="error-clock" role="alert" className="text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <TouchButton type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isLoading} data-testid="btn-cancel-clock">
            Cancel
          </TouchButton>
          <TouchButton type="button" variant="primary" className="flex-1" onClick={handleSave} disabled={isLoading} data-loading={isLoading} data-testid="btn-set-clock">
            {isLoading ? 'Setting...' : 'Set clock'}
          </TouchButton>
        </div>
      </div>
    </BottomSheet>
  );
}
