'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Hls from 'hls.js';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Public watch link viewer
 *
 * Stable URL: /watch/{ORG}/{TEAM}/{EVENTCODE?}
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type Bootstrap =
  | {
      accessMode: 'public_free';
      orgShortName: string;
      teamSlug: string;
      playerType: 'hls' | 'embed';
      streamUrl: string;
    }
  | {
      accessMode: 'pay_per_view';
      orgShortName: string;
      teamSlug: string;
      priceCents: number;
      currency: string;
      checkoutRequired: boolean;
    };

const CheckoutSchema = z.object({
  viewerEmail: z.string().email('Invalid email address'),
  viewerPhone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number').optional().or(z.literal('')),
});

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
  const router = useRouter();
  const org = (params.org as string) || '';
  const team = (params.team as string) || '';
  const codeParts = (params.code as string[] | undefined) ?? [];
  const eventCode = codeParts[0] || undefined;

  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const title = useMemo(() => `${org}/${team}`, [org, team]);

  const form = useForm<z.infer<typeof CheckoutSchema>>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      viewerEmail: '',
      viewerPhone: '',
    },
  });

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

  async function handleCheckout(data: z.infer<typeof CheckoutSchema>) {
    if (bootstrap?.accessMode !== 'pay_per_view') return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/public/watch-links/${encodeURIComponent(org)}/${encodeURIComponent(team)}/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewerEmail: data.viewerEmail,
            viewerPhone: data.viewerPhone || undefined,
            code: eventCode,
          }),
        }
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || 'Failed to create checkout');
      }

      const result = (await res.json()) as { purchaseId: string; checkoutUrl: string };
      router.push(`/checkout/${result.purchaseId}/payment`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create checkout');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!bootstrap || bootstrap.accessMode !== 'public_free' || bootstrap.playerType !== 'hls') return;
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

  const muxPlaybackId =
    bootstrap?.accessMode === 'public_free' && bootstrap.playerType === 'hls'
      ? parseMuxPlaybackIdFromHlsUrl(bootstrap.streamUrl)
      : null;

  function formatPrice(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

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

            {/* Public Free - Show Player */}
            {!loading && !error && bootstrap?.accessMode === 'public_free' && bootstrap.playerType === 'hls' && (
              <div className="space-y-2" data-testid="video-player">
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

            {!loading && !error && bootstrap?.accessMode === 'public_free' && bootstrap.playerType === 'embed' && (
              <div className="space-y-2" data-testid="video-player">
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

            {/* Pay Per View - Show Checkout Form */}
            {!loading && !error && bootstrap?.accessMode === 'pay_per_view' && (
              <div className="space-y-4" data-testid="form-checkout">
                <div className="text-center">
                  <p className="text-lg font-semibold">Pay to Watch</p>
                  <p className="text-2xl font-bold" data-testid="price-display">{formatPrice(bootstrap.priceCents, bootstrap.currency)}</p>
                </div>

                <form onSubmit={form.handleSubmit(handleCheckout)} data-testid="form-watch-link-checkout" className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="viewerEmail">Email *</Label>
                    <Input
                      id="viewerEmail"
                      type="email"
                      {...form.register('viewerEmail')}
                      data-testid="input-viewer-email"
                      aria-describedby={form.formState.errors.viewerEmail ? 'email-error' : undefined}
                    />
                    {form.formState.errors.viewerEmail && (
                      <span id="email-error" data-testid="error-email" role="alert" className="text-sm text-destructive">
                        {form.formState.errors.viewerEmail.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="viewerPhone">Phone (Optional)</Label>
                    <Input
                      id="viewerPhone"
                      type="tel"
                      placeholder="+1234567890"
                      {...form.register('viewerPhone')}
                      data-testid="input-viewer-phone"
                      aria-describedby={form.formState.errors.viewerPhone ? 'phone-error' : undefined}
                    />
                    {form.formState.errors.viewerPhone && (
                      <span id="phone-error" data-testid="error-phone" role="alert" className="text-sm text-destructive">
                        {form.formState.errors.viewerPhone.message}
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="btn-submit-checkout"
                    data-loading={submitting}
                    disabled={submitting}
                    aria-label="Submit checkout form"
                  >
                    {submitting ? 'Processing...' : `Pay ${formatPrice(bootstrap.priceCents, bootstrap.currency)}`}
                  </Button>
                </form>
              </div>
            )}

            {!loading && !error && !bootstrap && (
              <div data-testid="empty-watch-link" className="text-sm text-muted-foreground">
                Stream is offline or not available. Please check back later.
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
      </div>
    </div>
  );
}


