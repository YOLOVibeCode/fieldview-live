'use client';

/**
 * Shared header for /demo/multi-channel: stream URL + one sport/clock overlay.
 */

import { FormEvent, useState } from 'react';
import { sportRegistry } from '@fieldview/data-model';
import { DemoProducerControls } from '@/components/demo/DemoProducerControls';
import { useDemoStreamRoom } from '@/hooks/useDemoStreamRoom';
import type { DemoStreamRoom } from '@/lib/demo/DemoStreamRoom';
import { DEFAULT_DEMO_STREAM, loadDemoPlayback } from '@/lib/demo/resolveDemoStream';

export function MultiChannelToolbar({ room }: { room: DemoStreamRoom }) {
  const stream = useDemoStreamRoom(room, 'producer');
  const [input, setInput] = useState(DEFAULT_DEMO_STREAM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadDemoPlayback(input);
      stream.setPlaybackSrc(loaded.src);
      if (loaded.sportId) {
        const known = sportRegistry.listSports().some((s) => s.id === loaded.sportId);
        if (known) stream.setSport(loaded.sportId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load stream');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-testid="multi-channel-toolbar">
      <form
        data-testid="form-load-stream"
        onSubmit={handleLoad}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="input-stream-url" className="text-xs text-white/60">
            Stream URL or FieldView slug
          </label>
          <input
            id="input-stream-url"
            data-testid="input-stream-url"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={DEFAULT_DEMO_STREAM}
            aria-describedby={error ? 'error-stream-url' : undefined}
            className="w-full rounded border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <button
          type="submit"
          data-testid="btn-load-stream"
          data-loading={loading}
          disabled={loading}
          aria-label="Load stream into both channels"
          className="rounded bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </form>
      {error && (
        <p id="error-stream-url" data-testid="error-stream-url" role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <DemoProducerControls stream={stream} selectId="sport-select-producer" />

      <p
        data-testid="shared-last-action"
        className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
      >
        {stream.lastAction ?? 'Waiting for a change on either channel…'}
      </p>
    </div>
  );
}
