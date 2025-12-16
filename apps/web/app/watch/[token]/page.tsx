/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Hls from 'hls.js';

import { apiClient, ApiError, type WatchBootstrapResponse } from '@/lib/api-client';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { createWatchTelemetry } from '@/lib/watch-telemetry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type UiState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; bootstrap: WatchBootstrapResponse };

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [ui, setUi] = useState<UiState>({ kind: 'loading' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  const telemetry = useMemo(() => createWatchTelemetry(Date.now()), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const bootstrapData = await apiClient.getWatchBootstrap(token);
        if (cancelled) return;
        setUi({ kind: 'ready', bootstrap: bootstrapData });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setUi({ kind: 'error', message: err.message });
        } else {
          setUi({ kind: 'error', message: 'Failed to load watch session.' });
        }
      }
    }

    if (token) void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Create playback session once bootstrap is ready
  useEffect(() => {
    if (ui.kind !== 'ready') return;
    if (!token) return;

    let cancelled = false;

    async function createSession() {
      try {
        const session = await apiClient.createWatchSession(token, {
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          },
        });

        if (cancelled) return;
        setSessionId(session.sessionId);
        dataEventBus.emit(DataEvents.SESSION_STARTED, {
          token,
          sessionId: session.sessionId,
          startedAt: session.startedAt,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setUi({ kind: 'error', message: err.message });
        } else {
          setUi({ kind: 'error', message: 'Failed to start playback session.' });
        }
      }
    }

    void createSession();

    return () => {
      cancelled = true;
    };
  }, [ui.kind, token]);

  // Attach video player for HLS once we have bootstrap + session
  useEffect(() => {
    if (ui.kind !== 'ready') return;
    const { bootstrap } = ui;
    if (bootstrap.playerType !== 'hls') return;
    if (!bootstrap.streamUrl) return;
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Basic media event telemetry
    const onPlaying = () => {
      telemetry.onBufferEnd();
      telemetry.onPlay();
    };
    const onPause = () => telemetry.onPause();
    const onWaiting = () => telemetry.onBufferStart();
    const onSeeking = () => telemetry.onSeek();
    const onError = () => telemetry.onFatalError('media_error');

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('error', onError);

    // HLS wiring
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = bootstrap.streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        // Keep defaults; we rely on entitlement gatekeeping at bootstrap/session.
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          telemetry.onFatalError(`hls_fatal:${data.type ?? 'unknown'}`);
        } else {
          telemetry.onQualityChange(Date.now(), { hlsErrorType: data?.type, details: data?.details });
        }
      });

      hls.loadSource(bootstrap.streamUrl);
      hls.attachMedia(video);
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('error', onError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [ui, telemetry]);

  // Periodic telemetry flush
  useEffect(() => {
    if (!sessionId) return;
    if (!token) return;

    let stopped = false;

    async function flushOnce() {
      if (stopped) return;
      if (!telemetry.hasEvents()) return;

      const events = telemetry.drainEvents(50);
      if (events.length === 0) return;

      try {
        await apiClient.submitWatchTelemetry(token, sessionId, { events });
      } catch {
        // Best-effort: do not fail playback UI on telemetry issues.
      }
    }

    flushTimerRef.current = window.setInterval(() => {
      void flushOnce();
    }, 5000);

    return () => {
      stopped = true;
      if (flushTimerRef.current) {
        window.clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [sessionId, token, telemetry]);

  // End session on unload
  useEffect(() => {
    if (!sessionId) return;
    if (!token) return;

    const onBeforeUnload = () => {
      // Fire-and-forget: browsers may not wait for async work here.
      void apiClient.endWatchSession(token, sessionId, telemetry.buildEndSessionRequest());
      dataEventBus.emit(DataEvents.SESSION_ENDED, { token, sessionId });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [sessionId, telemetry, token]);

  async function endNow() {
    if (!sessionId) return;
    if (!token) return;
    setEnding(true);
    try {
      // Flush remaining events if any (best effort)
      if (telemetry.hasEvents()) {
        const events = telemetry.drainEvents(200);
        if (events.length > 0) {
          await apiClient.submitWatchTelemetry(token, sessionId, { events });
        }
      }
      await apiClient.endWatchSession(token, sessionId, telemetry.buildEndSessionRequest());
      dataEventBus.emit(DataEvents.SESSION_ENDED, { token, sessionId });
      router.push('/');
    } finally {
      setEnding(false);
    }
  }

  if (ui.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading stream…</CardTitle>
            <CardDescription>Preparing your watch experience.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (ui.kind === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to start</CardTitle>
            <CardDescription>{ui.message}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { bootstrap } = ui;

  const stateLabel =
    bootstrap.state === 'live'
      ? 'Live'
      : bootstrap.state === 'not_started'
        ? 'Not started'
        : bootstrap.state === 'ended'
          ? 'Ended'
          : 'Unavailable';

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{bootstrap.gameInfo?.title || 'Watch'}</CardTitle>
          <CardDescription>
            Status: {stateLabel}
            {sessionId ? ` • Session: ${sessionId}` : ' • Starting session…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bootstrap.state !== 'live' ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              This stream is currently {stateLabel.toLowerCase()}.
            </div>
          ) : bootstrap.playerType === 'embed' ? (
            <div className="aspect-video w-full overflow-hidden rounded-md border">
              <iframe
                title="Embedded Stream"
                src={bootstrap.streamUrl}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full"
                  controls
                  playsInline
                  preload="auto"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Protection: {bootstrap.protectionLevel || 'best_effort'}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={endNow} disabled={!sessionId || ending} variant="outline">
            {ending ? 'Ending…' : 'End & Exit'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


