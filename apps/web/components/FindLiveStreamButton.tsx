/**
 * FindLiveStreamButton
 *
 * Asks the API what is live right now on the owner's streaming providers (Veo, …).
 * One live stream is taken automatically; several are offered as a list.
 * It only fills the stream URL — saving stays with the admin panel's Save button.
 */

'use client';

import { useState } from 'react';

import { ApiError, apiRequest } from '@/lib/api-client';

import { Button } from './ui/button';

interface FoundLiveStream {
  provider: string;
  providerName: string;
  title: string;
  streamUrl: string;
}

interface SourceReport {
  provider: string;
  displayName: string;
  status: 'ok' | 'needs_reconnect' | 'error';
}

interface LiveStreamSearchResponse {
  streams: FoundLiveStream[];
  sources: SourceReport[];
}

type SearchResult =
  | { kind: 'picked'; stream: FoundLiveStream }
  | { kind: 'choose'; streams: FoundLiveStream[] }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string };

interface FindLiveStreamButtonProps {
  /** Page slug: a stream ("diablos") or a game ("diablos/soccer-20261115"). */
  slug: string;
  adminToken: string;
  onPick: (streamUrl: string) => void;
}

function names(sources: SourceReport[]): string {
  return sources.map((s) => s.displayName).join(', ');
}

/** Explain a search that found no streams: not connected, broken, or just nothing live. */
function describeNothingFound(sources: SourceReport[]): SearchResult {
  if (sources.length === 0) {
    return { kind: 'empty', message: 'No streaming provider is connected to this account yet.' };
  }
  const needReconnect = sources.filter((s) => s.status === 'needs_reconnect');
  if (needReconnect.length > 0) {
    return { kind: 'error', message: `${names(needReconnect)} needs to be reconnected before it can be searched.` };
  }
  const failed = sources.filter((s) => s.status === 'error');
  if (failed.length > 0) {
    return { kind: 'error', message: `Could not reach ${names(failed)} right now. Try again in a moment.` };
  }
  return { kind: 'empty', message: `Nothing is live on ${names(sources)} right now.` };
}

function titleOf(stream: FoundLiveStream): string {
  return stream.title.trim() || 'Untitled stream';
}

export function FindLiveStreamButton({ slug, adminToken, onPick }: FindLiveStreamButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const pick = (stream: FoundLiveStream) => {
    onPick(stream.streamUrl);
    setResult({ kind: 'picked', stream });
  };

  const search = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest<LiveStreamSearchResponse>(
        `/api/direct/${encodeURIComponent(slug.toLowerCase())}/live-streams`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (data.streams.length === 1) {
        pick(data.streams[0]);
      } else if (data.streams.length > 1) {
        setResult({ kind: 'choose', streams: data.streams });
      } else {
        setResult(describeNothingFound(data.sources));
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not search for live streams. Try again.';
      setResult({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="find-live-stream">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void search()}
        disabled={loading}
        data-testid="btn-find-live-stream"
        data-loading={loading}
        aria-label="Find a live stream from your streaming provider"
      >
        {loading ? 'Searching…' : 'Find live stream'}
      </Button>

      {result?.kind === 'picked' && (
        <p className="text-xs text-muted-foreground" role="status" data-testid="live-stream-picked">
          Found “{titleOf(result.stream)}” on {result.stream.providerName}. Press Save to use it.
        </p>
      )}

      {result?.kind === 'choose' && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground" id="live-streams-heading">
            {result.streams.length} streams are live. Choose one:
          </p>
          <ul className="space-y-1" aria-labelledby="live-streams-heading" data-testid="list-live-streams">
            {result.streams.map((stream) => (
              <li key={stream.streamUrl}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => pick(stream)}
                  data-testid={`btn-use-live-stream-${stream.streamUrl}`}
                >
                  <span className="truncate">{titleOf(stream)}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground">{stream.providerName}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.kind === 'empty' && (
        <p className="text-xs text-muted-foreground" role="status" data-testid="empty-live-streams">
          {result.message}
        </p>
      )}

      {result?.kind === 'error' && (
        <p className="text-xs text-destructive" role="alert" data-testid="error-live-streams">
          {result.message}
        </p>
      )}
    </div>
  );
}
