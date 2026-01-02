'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * POC: Watch Link Admin
 *
 * Owner-token driven UI to create org/channel and update the stream behind a stable watch link.
 */

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

async function api(endpoint: string, token: string, body?: unknown, method: 'POST' | 'PATCH' = 'POST') {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export default function WatchLinkAdminPOCPage() {
  const [ownerToken, setOwnerToken] = useState('');
  const [orgShortName, setOrgShortName] = useState('TCHSKISD');
  const [orgName, setOrgName] = useState('Timber Creek High School');
  const [teamSlug, setTeamSlug] = useState('SoccerJV2');
  const [teamName, setTeamName] = useState('Soccer JV2');
  const [requireEventCode, setRequireEventCode] = useState(false);
  const [eventCode, setEventCode] = useState('4134254');

  const [hlsUrl, setHlsUrl] = useState('https://stream.mux.com/CuBsAMq01UF1D8jtY00NI281PVO7Wfy97PW002DLg02XZ4U.m3u8');
  const muxPlaybackId = useMemo(() => parseMuxPlaybackIdFromHlsUrl(hlsUrl), [hlsUrl]);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchLink = useMemo(() => {
    const base = `/watch/${encodeURIComponent(orgShortName)}/${encodeURIComponent(teamSlug)}`;
    return eventCode ? `${base}/${encodeURIComponent(eventCode)}` : base;
  }, [orgShortName, teamSlug, eventCode]);

  const createOrg = async () => {
    setError(null);
    setStatus('Creating org…');
    try {
      await api('/api/owners/me/watch-links/orgs', ownerToken.trim(), {
        shortName: orgShortName.trim(),
        name: orgName.trim(),
      });
      setStatus('Org created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create org');
      setStatus(null);
    }
  };

  const createChannel = async () => {
    setError(null);
    setStatus('Creating/updating channel…');
    try {
      const body =
        muxPlaybackId
          ? { teamSlug, displayName: teamName, requireEventCode, streamType: 'mux_playback', muxPlaybackId }
          : { teamSlug, displayName: teamName, requireEventCode, streamType: 'byo_hls', hlsManifestUrl: hlsUrl };

      await api(`/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName)}/channels`, ownerToken.trim(), body);
      setStatus('Channel created/updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create channel');
      setStatus(null);
    }
  };

  const updateStream = async () => {
    setError(null);
    setStatus('Updating stream…');
    try {
      const body =
        muxPlaybackId
          ? { requireEventCode, streamType: 'mux_playback', muxPlaybackId }
          : { requireEventCode, streamType: 'byo_hls', hlsManifestUrl: hlsUrl };

      await api(
        `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName)}/channels/${encodeURIComponent(teamSlug)}`,
        ownerToken.trim(),
        body,
        'PATCH'
      );
      setStatus('Stream updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update stream');
      setStatus(null);
    }
  };

  const createEvent = async () => {
    setError(null);
    setStatus('Creating event code…');
    try {
      await api(
        `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName)}/channels/${encodeURIComponent(teamSlug)}/event-codes`,
        ownerToken.trim(),
        { code: eventCode.trim() }
      );
      setStatus('Event code created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event code');
      setStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card data-testid="card-watch-link-admin">
          <CardHeader>
            <CardTitle>Watch Link Admin (POC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="owner-token">Owner JWT Token</Label>
              <Input
                id="owner-token"
                data-testid="input-owner-token"
                value={ownerToken}
                onChange={(e) => setOwnerToken(e.target.value)}
                placeholder="Bearer token (without 'Bearer ')"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-short">Org short name</Label>
                <Input id="org-short" data-testid="input-org-short" value={orgShortName} onChange={(e) => setOrgShortName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-name">Org name</Label>
                <Input id="org-name" data-testid="input-org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-slug">Team slug</Label>
                <Input id="team-slug" data-testid="input-team-slug" value={teamSlug} onChange={(e) => setTeamSlug(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-name">Team display name</Label>
                <Input id="team-name" data-testid="input-team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-code">Event code (optional)</Label>
                <Input id="event-code" data-testid="input-event-code" value={eventCode} onChange={(e) => setEventCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="require-event">Require event code</Label>
                <Input
                  id="require-event"
                  data-testid="checkbox-require-event-code"
                  type="checkbox"
                  checked={requireEventCode}
                  onChange={(e) => setRequireEventCode(e.target.checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hls-url">Stream URL (paste `.m3u8`)</Label>
              <Input
                id="hls-url"
                data-testid="input-hls-url"
                value={hlsUrl}
                onChange={(e) => setHlsUrl(e.target.value)}
                placeholder="https://stream.mux.com/<playbackId>.m3u8"
              />
              <div className="text-xs text-muted-foreground" data-testid="text-detected-stream-type">
                Detected: {muxPlaybackId ? `Mux playbackId = ${muxPlaybackId}` : 'BYO HLS'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" data-testid="btn-create-org" onClick={createOrg} disabled={!ownerToken.trim()}>
                Create Org
              </Button>
              <Button type="button" data-testid="btn-create-channel" onClick={createChannel} disabled={!ownerToken.trim()}>
                Create/Upsert Channel
              </Button>
              <Button type="button" data-testid="btn-update-stream" onClick={updateStream} disabled={!ownerToken.trim()}>
                Update Stream
              </Button>
              <Button type="button" data-testid="btn-create-event-code" onClick={createEvent} disabled={!ownerToken.trim() || !eventCode.trim()}>
                Create Event Code
              </Button>
            </div>

            <div className="rounded-md border p-3 text-sm" data-testid="card-watch-link-preview">
              <div className="font-semibold">Viewer link (stable):</div>
              <div className="break-all">
                <a href={watchLink} data-testid="link-watch-link" className="underline">
                  {watchLink}
                </a>
              </div>
            </div>

            {status && (
              <div data-testid="text-status" className="text-sm text-muted-foreground" data-loading="false">
                {status}
              </div>
            )}
            {error && (
              <div role="alert" data-testid="error-admin" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


