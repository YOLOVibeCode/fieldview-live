'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Hls from 'hls.js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscribeForm } from '@/components/SubscribeForm';

/**
 * Public watch link viewer
 *
 * Stable URL: /watch/{ORG}/{TEAM}/{EVENTCODE?}
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type Bootstrap =
  | { playerType: 'hls'; streamUrl: string; orgShortName: string; teamSlug: string }
  | { playerType: 'embed'; streamUrl: string; orgShortName: string; teamSlug: string };

function parseMuxPlaybackIdFromHlsUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'stream.mux.com') return null;
    const m = u.pathname.match(/^\/([A-Za-z0-9]+)\.m3u8$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export default function WatchLinkPage() {
  const params = useParams();
  const org = (params.org as string) || '';
  const team = (params.team as string) || '';
  const codeParts = (params.code as string[] | undefined) ?? [];
  const eventCode = codeParts[0] || undefined;

  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const title = useMemo(() => `${org}/${team}`, [org, team]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBootstrap(null);

    const url = new URL(`${API_URL}/api/public/watch-links/${encodeURIComponent(org)}/${encodeURIComponent(team)}`);
    if (eventCode) url.searchParams.set('code', eventCode);

    void (async () => {
      try {
        const res = await fetch(url.toString(), { method: 'GET' });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(body?.error?.message || `Failed to load stream (${res.status})`);
        }
        const data = (await res.json()) as Bootstrap;
        if (!cancelled) setBootstrap(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stream');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org, team, eventCode]);

  useEffect(() => {
    if (!bootstrap || bootstrap.playerType !== 'hls') return;
    if (!videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = bootstrap.streamUrl;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return;
    }

    if (!Hls.isSupported()) {
      setError('HLS is not supported in this browser');
      return;
    }

    const hls = new Hls({
      // Stability-first (avoid LL-HLS behavior)
      lowLatencyMode: false,
      // Aim for ~25-35s latency with room for jitter
      liveSyncDuration: 30,
      liveMaxLatencyDuration: 75,
      maxBufferLength: 90,
      backBufferLength: 90,
    });
    hlsRef.current = hls;

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        setError(`Playback error: ${data.type}`);
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [bootstrap]);

  const muxPlaybackId = bootstrap?.playerType === 'hls' ? parseMuxPlaybackIdFromHlsUrl(bootstrap.streamUrl) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card data-testid="card-watch-link">
          <CardHeader>
            <CardTitle data-testid="text-title">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div data-testid="loading-watch-link" data-loading="true" className="text-sm text-muted-foreground">
                Loading stream…
              </div>
            )}

            {error && (
              <div role="alert" data-testid="error-watch-link" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && bootstrap?.playerType === 'hls' && (
              <div className="space-y-2">
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                    autoPlay
                    muted={false}
                    aria-label="Watch stream player"
                    data-testid="video-watch-link"
                    data-loading={false}
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div data-testid="text-stream-url" className="break-all">
                    <span className="font-semibold">Stream:</span> {bootstrap.streamUrl}
                  </div>
                  {muxPlaybackId && (
                    <div data-testid="text-playback-id" className="break-all">
                      <span className="font-semibold">Mux playbackId:</span> {muxPlaybackId}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && bootstrap?.playerType === 'embed' && (
              <div className="space-y-2">
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <iframe
                    src={bootstrap.streamUrl}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    title="Embedded stream"
                    data-testid="iframe-watch-link"
                  />
                </div>
              </div>
            )}

            {!loading && !error && !bootstrap && (
              <div data-testid="empty-watch-link" className="text-sm text-muted-foreground">
                No stream configured.
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                data-testid="btn-reload-watch-link"
              >
                Reload
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscribe Form */}
        {!loading && !error && bootstrap && (
          <div className="mt-4">
            <SubscribeForm
              organizationId={undefined} // Will be fetched from bootstrap if needed
              channelId={undefined} // Will be fetched from bootstrap if needed
            />
          </div>
        )}
      </div>
    </div>
  );
}


