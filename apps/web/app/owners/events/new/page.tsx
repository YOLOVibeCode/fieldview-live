/**
 * Create Event Page
 *
 * Dead-easy form for coaches to create events with live link preview.
 */

'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

const CreateEventSchema = z.object({
  organizationId: z.string().uuid(),
  channelId: z.string().uuid(),
  startsAt: z.string().min(1, 'Start time is required'),
  streamType: z.enum(['mux_playback', 'byo_hls', 'external_embed']).optional(),
  muxPlaybackId: z.string().optional(),
  hlsManifestUrl: z.string().url().optional(),
  externalEmbedUrl: z.string().url().optional(),
  externalProvider: z.enum(['youtube', 'twitch', 'vimeo', 'other']).optional(),
  accessMode: z.enum(['public_free', 'pay_per_view']).optional(),
  priceCents: z.number().int().positive().optional(),
});

type CreateEventValues = z.infer<typeof CreateEventSchema>;

interface Organization {
  id: string;
  shortName: string;
  name: string;
}

interface Channel {
  id: string;
  teamSlug: string;
  displayName: string;
  organizationId: string;
}

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgShortName = searchParams.get('org');

  const [authenticated, setAuthenticated] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<{ id: string; canonicalPath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateEventValues>({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      startsAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
    },
  });

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');

    if (!token || !expires) {
      router.replace('/owners/login');
      return;
    }

    if (new Date(expires) < new Date()) {
      localStorage.removeItem('owner_token');
      localStorage.removeItem('owner_token_expires');
      router.replace('/owners/login');
      return;
    }

    setAuthenticated(true);
    void loadOrganizationsAndChannels(token);
  }, [router, orgShortName]);

  // Update preview link when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.organizationId && values.channelId && values.startsAt) {
        // Generate preview link (simplified - actual implementation would use the API)
        const org = organizations.find((o) => o.id === values.organizationId);
        const channel = channels.find((c) => c.id === values.channelId);
        if (org && channel) {
          const startsAt = new Date(values.startsAt);
          const urlKey = `${startsAt.getFullYear()}${String(startsAt.getMonth() + 1).padStart(2, '0')}${String(startsAt.getDate()).padStart(2, '0')}${String(startsAt.getHours()).padStart(2, '0')}${String(startsAt.getMinutes()).padStart(2, '0')}`;
          setPreviewLink(`fieldview.live/${org.shortName}/${channel.teamSlug}/${urlKey}`);
        }
      } else {
        setPreviewLink(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, organizations, channels]);

  async function loadOrganizationsAndChannels(token: string) {
    try {
      // TODO: Fetch organizations and channels from API
      // For now, placeholder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  }

  async function onSubmit(values: CreateEventValues) {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('owner_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Extract orgShortName and teamSlug from form
      const org = organizations.find((o) => o.id === values.organizationId);
      const channel = channels.find((c) => c.id === values.channelId);
      if (!org || !channel) {
        throw new Error('Organization or channel not found');
      }

      const response = await fetch(`${API_URL}/api/owners/me/orgs/${org.shortName}/channels/${channel.teamSlug}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: values.organizationId,
          channelId: values.channelId,
          startsAt: values.startsAt,
          streamType: values.streamType,
          muxPlaybackId: values.muxPlaybackId,
          hlsManifestUrl: values.hlsManifestUrl,
          externalEmbedUrl: values.externalEmbedUrl,
          externalProvider: values.externalProvider,
          accessMode: values.accessMode,
          priceCents: values.priceCents,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || 'Failed to create event');
      }

      const data = (await response.json()) as { id: string; canonicalPath: string };
      setCreatedEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Create Event</h1>
          <p className="text-muted-foreground">Schedule a new event and generate a stable watch link</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md" data-testid="error-message">
            {error}
          </div>
        )}

        {createdEvent ? (
          <Card data-testid="card-event-created">
            <CardHeader>
              <CardTitle>Event Created!</CardTitle>
              <CardDescription>Your event has been created successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Watch Link</Label>
                <div className="mt-1 p-2 bg-muted rounded-md break-all" data-testid="text-canonical-path">
                  {createdEvent.canonicalPath}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  data-testid="btn-copy-link"
                  onClick={() => {
                    void navigator.clipboard.writeText(`https://fieldview.live${createdEvent.canonicalPath}`);
                  }}
                >
                  Copy Link
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => {
                  router.push('/owners/coach');
                }}
                data-testid="btn-back-to-dashboard"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-create-event">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Fill in the details to create your event</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="form-create-event">
                <div className="space-y-1">
                  <Label htmlFor="organizationId">Organization</Label>
                  <select
                    id="organizationId"
                    data-testid="select-organization"
                    {...form.register('organizationId')}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.organizationId && (
                    <span id="organizationId-error" data-testid="error-organizationId" role="alert" className="text-sm text-destructive">
                      {form.formState.errors.organizationId.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="channelId">Team</Label>
                  <select
                    id="channelId"
                    data-testid="select-channel"
                    {...form.register('channelId')}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={!form.watch('organizationId')}
                  >
                    <option value="">Select team...</option>
                    {channels
                      .filter((c) => c.organizationId === form.watch('organizationId'))
                      .map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.displayName}
                        </option>
                      ))}
                  </select>
                  {form.formState.errors.channelId && (
                    <span id="channelId-error" data-testid="error-channelId" role="alert" className="text-sm text-destructive">
                      {form.formState.errors.channelId.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="startsAt">Start Time</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    data-testid="input-starts-at"
                    {...form.register('startsAt')}
                    aria-describedby={form.formState.errors.startsAt ? 'startsAt-error' : undefined}
                  />
                  {form.formState.errors.startsAt && (
                    <span id="startsAt-error" data-testid="error-startsAt" role="alert" className="text-sm text-destructive">
                      {form.formState.errors.startsAt.message}
                    </span>
                  )}
                </div>

                {previewLink && (
                  <div className="p-4 bg-muted rounded-md" data-testid="card-link-preview">
                    <Label className="font-semibold">Link Preview</Label>
                    <div className="mt-1 break-all text-sm" data-testid="text-link-preview">
                      {previewLink}
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading} data-testid="btn-submit" data-loading={loading}>
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}

