'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

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

async function ownerApi<TResponse>(endpoint: string, token: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<TResponse> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }

  return (await res.json().catch(() => ({}))) as TResponse;
}

export default function OwnerCreateWatchLinkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [orgShortName, setOrgShortName] = useState('TCHSKISD');
  const [orgName, setOrgName] = useState('Timber Creek High School');
  const [teamSlug, setTeamSlug] = useState('SoccerJV2');
  const [teamName, setTeamName] = useState('Soccer JV2');

  const [eventCode, setEventCode] = useState('');
  const [requireEventCode, setRequireEventCode] = useState(false);

  const [streamUrl, setStreamUrl] = useState('https://stream.mux.com/REPLACE_ME.m3u8');
  const muxPlaybackId = useMemo(() => parseMuxPlaybackIdFromHlsUrl(streamUrl), [streamUrl]);

  const watchLink = useMemo(() => {
    const base = `/watch/${encodeURIComponent(orgShortName)}/${encodeURIComponent(teamSlug)}`;
    return eventCode ? `${base}/${encodeURIComponent(eventCode)}` : base;
  }, [orgShortName, teamSlug, eventCode]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  }

  async function createOrUpdateAll() {
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('owner_token');
      if (!token) {
        router.replace('/owners/login');
        return;
      }

      setStatus('Creating organization…');
      await ownerApi<{ id: string }>('/api/owners/me/watch-links/orgs', token, {
        shortName: orgShortName.trim(),
        name: orgName.trim(),
      });

      setStatus('Creating/updating channel…');
      const channelBody = muxPlaybackId
        ? {
            teamSlug: teamSlug.trim(),
            displayName: teamName.trim(),
            requireEventCode,
            accessMode: 'public_free',
            streamType: 'mux_playback',
            muxPlaybackId,
          }
        : {
            teamSlug: teamSlug.trim(),
            displayName: teamName.trim(),
            requireEventCode,
            accessMode: 'public_free',
            streamType: 'byo_hls',
            hlsManifestUrl: streamUrl.trim(),
          };

      await ownerApi(
        `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName.trim())}/channels`,
        token,
        channelBody
      );

      if (eventCode.trim()) {
        setStatus('Creating event code…');
        await ownerApi(
          `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName.trim())}/channels/${encodeURIComponent(
            teamSlug.trim()
          )}/event-codes`,
          token,
          { code: eventCode.trim() }
        );
      }

      setStatus('Done. Your stable watch link is ready.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create watch link');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card data-testid="card-create-watch-link">
          <CardHeader>
            <CardTitle>Create Stable Watch Link</CardTitle>
            <CardDescription>Create a stable /watch/&lt;ORG&gt;/&lt;TEAM&gt; link and point it at a stream source (Mux or HLS).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form data-testid="form-create-watch-link" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="orgShortName">Org short name</Label>
                  <Input
                    id="orgShortName"
                    data-testid="input-org-short"
                    value={orgShortName}
                    onChange={(e) => setOrgShortName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="orgName">Org name</Label>
                  <Input id="orgName" data-testid="input-org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="teamSlug">Team slug</Label>
                  <Input id="teamSlug" data-testid="input-team-slug" value={teamSlug} onChange={(e) => setTeamSlug(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="teamName">Team display name</Label>
                  <Input id="teamName" data-testid="input-team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="eventCode">Event code (optional)</Label>
                  <Input id="eventCode" data-testid="input-event-code" value={eventCode} onChange={(e) => setEventCode(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requireEventCode">Require event code</Label>
                  <Input
                    id="requireEventCode"
                    data-testid="checkbox-require-event-code"
                    type="checkbox"
                    checked={requireEventCode}
                    onChange={(e) => setRequireEventCode(e.target.checked)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="streamUrl">Stream URL (.m3u8)</Label>
                <Input
                  id="streamUrl"
                  data-testid="input-stream-url"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://stream.mux.com/<playbackId>.m3u8 or https://example.com/stream.m3u8"
                />
                <div className="text-xs text-muted-foreground" data-testid="text-detected-source">
                  Detected source: {muxPlaybackId ? `Mux playbackId = ${muxPlaybackId}` : 'BYO HLS'}
                </div>
              </div>

              <Button
                type="button"
                data-testid="btn-submit-create-watch-link"
                onClick={createOrUpdateAll}
                disabled={loading}
                data-loading={loading}
                aria-label="Create stable watch link"
              >
                {loading ? 'Working…' : 'Create Watch Link'}
              </Button>
            </form>

            <div className="rounded-md border p-3 text-sm" data-testid="card-watch-link-preview">
              <div className="font-semibold">Viewer link (stable):</div>
              <div className="break-all">
                <a href={watchLink} data-testid="link-watch-link" className="underline">
                  {watchLink}
                </a>
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" data-testid="btn-copy-watch-link" onClick={() => copy(watchLink)}>
                  Copy link
                </Button>
              </div>
            </div>

            {status && (
              <div data-testid="text-status" className="text-sm text-muted-foreground" data-loading={loading}>
                {status}
              </div>
            )}

            {error && (
              <div role="alert" data-testid="error-create-watch-link" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" data-testid="btn-back-dashboard" onClick={() => router.push('/owners/dashboard')}>
                Back to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


