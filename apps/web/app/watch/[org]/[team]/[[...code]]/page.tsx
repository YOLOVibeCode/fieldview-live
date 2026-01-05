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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SubscribeForm } from '@/components/SubscribeForm';
import { apiClient, ApiError } from '@/lib/api-client';

/**
 * Public watch link viewer
 *
 * Stable URL: /watch/{ORG}/{TEAM}/{EVENTCODE?}
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const checkoutSchema = z.object({
  viewerEmail: z.string().email('Please enter a valid email address'),
  viewerPhone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
  sendReminder: z.boolean().optional().default(false),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type Bootstrap =
  | { playerType: 'hls'; streamUrl: string; orgShortName: string; teamSlug: string; channelId: string; accessMode: 'public_free' | 'pay_per_view'; priceCents: number | null; currency: string | null; eventId?: string | null; eventStartsAt?: string | null; eventTitle?: string | null }
  | { playerType: 'embed'; streamUrl: string; orgShortName: string; teamSlug: string; channelId: string; accessMode: 'public_free' | 'pay_per_view'; priceCents: number | null; currency: string | null; eventId?: string | null; eventStartsAt?: string | null; eventTitle?: string | null };

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
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const title = useMemo(() => `${org}/${team}`, [org, team]);

  // Load saved form data from localStorage
  const getSavedFormData = (): Partial<CheckoutFormValues> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('fieldview_checkout_data');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CheckoutFormValues>;
        return {
          viewerEmail: parsed.viewerEmail || '',
          viewerPhone: parsed.viewerPhone || '',
          sendReminder: parsed.sendReminder || false,
        };
      }
    } catch (err) {
      console.warn('Failed to load saved form data:', err);
    }
    return {
      viewerEmail: '',
      viewerPhone: '',
      sendReminder: false,
    };
  };

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: getSavedFormData(),
  });

  // Save form data to localStorage when it changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (typeof window !== 'undefined' && values.viewerEmail) {
        try {
          localStorage.setItem('fieldview_checkout_data', JSON.stringify({
            viewerEmail: values.viewerEmail,
            viewerPhone: values.viewerPhone || '',
            sendReminder: values.sendReminder || false,
          }));
        } catch (err) {
          console.warn('Failed to save form data:', err);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const requiresPayment = bootstrap?.accessMode === 'pay_per_view' && bootstrap.priceCents && bootstrap.priceCents > 0;
  const hasAccess = !requiresPayment; // For now, assume free access means immediate access. Later we'll check entitlements.

  function formatPrice(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  }

  async function onSubmitCheckout(data: CheckoutFormValues) {
    if (!bootstrap) return;

    setCheckoutSubmitting(true);
    setCheckoutError(null);

    try {
      // Save form data to localStorage for next time
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fieldview_checkout_data', JSON.stringify({
            viewerEmail: data.viewerEmail,
            viewerPhone: data.viewerPhone || '',
            sendReminder: data.sendReminder || false,
          }));
        } catch (err) {
          console.warn('Failed to save form data:', err);
        }
      }

      // Subscribe to reminders if requested and event exists (do in parallel with checkout)
      const reminderPromise = data.sendReminder && bootstrap.eventId
        ? apiClient.subscribe({
            email: data.viewerEmail,
            phoneE164: data.viewerPhone || undefined,
            eventId: bootstrap.eventId,
            preference: 'email',
          }).catch((err) => {
            // Don't fail checkout if reminder subscription fails
            console.warn('Failed to subscribe to reminders:', err);
          })
        : Promise.resolve();

      // Create checkout (don't wait for reminder subscription)
      const checkoutPromise = apiClient.createChannelCheckout(org, team, {
        viewerEmail: data.viewerEmail,
        viewerPhone: data.viewerPhone || undefined,
        returnUrl: window.location.href,
      });

      // Wait for checkout, reminder subscription happens in parallel
      const checkout = await checkoutPromise;
      await reminderPromise; // Wait for reminder to complete (but don't fail if it errors)

      router.push(`/checkout/${checkout.purchaseId}/payment`);
    } catch (err) {
      if (err instanceof ApiError) {
        setCheckoutError(err.message);
      } else {
        setCheckoutError('Failed to create checkout. Please try again.');
      }
    } finally {
      setCheckoutSubmitting(false);
    }
  }

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
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
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

            {/* Paywall - Show when payment required */}
            {!loading && !error && requiresPayment && !hasAccess && (
              <div className="space-y-4" data-testid="paywall-watch-link">
                <div className="rounded-md border p-4 sm:p-6 text-center">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">There's a fee to receive the stream</h3>
                  <p className="text-2xl sm:text-3xl font-bold mb-4">
                    {bootstrap.priceCents ? formatPrice(bootstrap.priceCents, bootstrap.currency || 'USD') : ''}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    Complete payment to access the stream. Apple Pay and other convenient payment methods are available.
                  </p>
                </div>

                {/* Security & Privacy Notice */}
                <div className="rounded-md bg-muted/50 border border-muted p-3 sm:p-4" data-testid="payment-security-notice">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <svg
                      className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <div className="flex-1 text-left">
                      <p className="text-xs sm:text-sm font-medium text-foreground mb-1">
                        Secure Payment Processing
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Your payment information is processed securely by Square. We never store your card number, CVV, or other sensitive payment data. All transactions are encrypted and PCI-compliant.
                      </p>
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitCheckout)} className="space-y-4" data-testid="form-checkout">
                    <FormField
                      control={form.control}
                      name="viewerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="input-email">Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              id="input-email"
                              type="email"
                              placeholder="your@email.com"
                              data-testid="input-email"
                              autoComplete="email"
                              autoFocus
                              {...field}
                              onKeyDown={(e) => {
                                // Auto-submit on Enter if email is valid
                                if (e.key === 'Enter' && form.formState.isValid && !checkoutSubmitting) {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmitCheckout)();
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Required for stream access and payment receipts. We'll send your receipt to this email address.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="viewerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="input-phone">Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              id="input-phone"
                              type="tel"
                              placeholder="+1234567890"
                              data-testid="input-phone"
                              autoComplete="tel"
                              {...field}
                              onKeyDown={(e) => {
                                // Auto-submit on Enter if form is valid
                                if (e.key === 'Enter' && form.formState.isValid && !checkoutSubmitting) {
                                  e.preventDefault();
                                  form.handleSubmit(onSubmitCheckout)();
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            E.164 format (e.g., +1234567890). Used for SMS notifications.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Reminder checkbox - only show if event exists */}
                    {bootstrap.eventId && bootstrap.eventStartsAt && (
                      <FormField
                        control={form.control}
                        name="sendReminder"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                id="checkbox-reminder"
                                checked={Boolean(field.value)}
                                onChange={(e) => field.onChange(e.target.checked)}
                                data-testid="checkbox-reminder"
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel htmlFor="checkbox-reminder" className="cursor-pointer">
                                Send me a reminder email before the event
                              </FormLabel>
                              <FormDescription className="text-xs">
                                We'll send you an email reminder before the stream starts
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Calendar links - only show if event exists */}
                    {bootstrap.eventId && bootstrap.eventStartsAt && (() => {
                      const startTime = new Date(bootstrap.eventStartsAt);
                      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
                      const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
                      const title = bootstrap.eventTitle || `${bootstrap.orgShortName} ${bootstrap.teamSlug}`;
                      const description = `Watch the live stream: ${watchUrl}`;

                      // Google Calendar
                      const googleUrl = new URL('https://calendar.google.com/calendar/render');
                      googleUrl.searchParams.set('action', 'TEMPLATE');
                      googleUrl.searchParams.set('text', title);
                      googleUrl.searchParams.set('dates', `${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                      googleUrl.searchParams.set('details', description);
                      googleUrl.searchParams.set('sf', 'true');
                      googleUrl.searchParams.set('output', 'xml');

                      // Outlook Calendar
                      const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
                      outlookUrl.searchParams.set('subject', title);
                      outlookUrl.searchParams.set('startdt', startTime.toISOString());
                      outlookUrl.searchParams.set('enddt', endTime.toISOString());
                      outlookUrl.searchParams.set('body', description);
                      outlookUrl.searchParams.set('path', '/calendar/action/compose');
                      outlookUrl.searchParams.set('rru', 'addevent');

                      // iCal download handler
                      const downloadICal = () => {
                        const formatDate = (date: Date): string => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const escape = (text: string): string => text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
                        const icalContent = [
                          'BEGIN:VCALENDAR',
                          'VERSION:2.0',
                          'PRODID:-//FieldView.Live//NONSGML v1.0//EN',
                          'CALSCALE:GREGORIAN',
                          'METHOD:PUBLISH',
                          'BEGIN:VEVENT',
                          `UID:${startTime.getTime()}@fieldview.live`,
                          `DTSTAMP:${formatDate(new Date())}`,
                          `DTSTART:${formatDate(startTime)}`,
                          `DTEND:${formatDate(endTime)}`,
                          `SUMMARY:${escape(title)}`,
                          `DESCRIPTION:${escape(description)}`,
                          `URL:${watchUrl}`,
                          'END:VEVENT',
                          'END:VCALENDAR',
                        ].join('\r\n');
                        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${title.replace(/\s+/g, '-')}.ics`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      };

                      return (
                        <div className="rounded-md border p-3 sm:p-4 space-y-2">
                          <p className="text-xs sm:text-sm font-semibold">Add to Calendar:</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(googleUrl.toString(), '_blank')}
                              data-testid="btn-calendar-google"
                            >
                              Google Calendar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(outlookUrl.toString(), '_blank')}
                              data-testid="btn-calendar-outlook"
                            >
                              Outlook
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={downloadICal}
                              data-testid="btn-calendar-ical"
                            >
                              Download .ics
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {checkoutError && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid="error-checkout">
                        {checkoutError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full text-base sm:text-lg"
                      disabled={checkoutSubmitting || !form.formState.isValid}
                      data-testid="btn-submit-checkout"
                      aria-label="Continue to payment"
                      size="lg"
                    >
                      {checkoutSubmitting ? 'Processing...' : `Pay ${bootstrap.priceCents ? formatPrice(bootstrap.priceCents, bootstrap.currency || 'USD') : ''}`}
                    </Button>
                    <p className="text-xs sm:text-sm text-center text-muted-foreground px-2">
                      Secure payment powered by Square
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                      Press Enter to submit • Your information will be saved for next time
                    </p>
                  </form>
                </Form>
              </div>
            )}

            {/* Player - Show when access granted */}
            {!loading && !error && hasAccess && bootstrap?.playerType === 'hls' && (
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

            {!loading && !error && hasAccess && bootstrap?.playerType === 'embed' && (
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


