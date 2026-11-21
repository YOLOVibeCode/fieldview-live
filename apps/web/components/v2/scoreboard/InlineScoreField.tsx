/**
 * Inline score number. Tap to edit. Enter or blur commits. Escape restores.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export interface InlineScoreFieldProps {
  value: number;
  color: string;
  commit: (score: number) => void | Promise<void>;
  'aria-label': string;
}

const SCORE = /^(?:0|[1-9]\d{0,2})$/;

export function InlineScoreField({ value, color, commit, 'aria-label': ariaLabel }: InlineScoreFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    if (!editing) return;
    settled.current = false;
    setDraft(String(value));
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing, value]);

  const close = (save: boolean) => {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);
    if (!save || !SCORE.test(draft)) return;
    const next = Number(draft);
    if (next === value) return;
    void commit(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        data-testid="btn-inline-score"
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        className="tabular-nums font-bold leading-none rounded px-0.5"
        style={{ color, textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      data-testid="input-inline-score"
      aria-label={ariaLabel}
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => close(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          close(true);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
      }}
      className="w-10 bg-black/80 text-center text-sm font-bold tabular-nums rounded border border-white/40"
      style={{ color }}
    />
  );
}
