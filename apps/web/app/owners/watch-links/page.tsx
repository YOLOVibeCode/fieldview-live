'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type Channel = {
  id: string;
  teamSlug: string;
  displayName: string;
  streamType: string;
  accessMode: string;
  priceCents: number | null;
  currency: string | null;
  requireEventCode: boolean;
  muxPlaybackId: string | null;
  hlsManifestUrl: string | null;
  externalEmbedUrl: string | null;
  externalProvider: string | null;
};

type Org = {
  id: string;
  shortName: string;
  name: string;
  createdAt: string;
  channels: Channel[];
};

async function ownerApi<TResponse>(
  endpoint: string,
  token: string,
  options?: { method?: string; body?: unknown }
): Promise<TResponse> {
  const method = options?.method || (options?.body ? 'POST' : 'GET');
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }

  return (await res.json()) as TResponse;
}

function centsToUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function OwnerWatchLinksPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);

  // Inline edit state
  const [editingKey, setEditingKey] = useState<string | null>(null); // orgShortName/teamSlug
  const [editStreamUrl, setEditStreamUrl] = useState('');
  const [editAccessMode, setEditAccessMode] = useState('public_free');
  const [editPriceCents, setEditPriceCents] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchOrgs = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await ownerApi<{ orgs: Org[] }>('/api/owners/me/watch-links/orgs', token);
      setOrgs(resp.orgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load watch links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');
    if (!token || (expires && new Date(expires) < new Date())) {
      router.replace('/owners/login');
      return;
    }
    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (authenticated) fetchOrgs();
  }, [authenticated, fetchOrgs]);

  function startEdit(org: Org, ch: Channel) {
    const key = `${org.shortName}/${ch.teamSlug}`;
    if (editingKey === key) {
      setEditingKey(null);
      return;
    }
    setEditingKey(key);
    setEditStreamUrl(ch.hlsManifestUrl || ch.externalEmbedUrl || '');
    setEditAccessMode(ch.accessMode);
    setEditPriceCents(ch.priceCents || 0);
  }

  async function handleSave(orgShortName: string, teamSlug: string) {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      // Update settings (access mode, price)
      await ownerApi(
        `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName)}/channels/${encodeURIComponent(teamSlug)}/settings`,
        token,
        {
          method: 'PATCH',
          body: {
            accessMode: editAccessMode,
            priceCents: editAccessMode === 'pay_per_view' ? editPriceCents : undefined,
          },
        }
      );

      // Update stream if URL changed
      if (editStreamUrl.trim()) {
        const isMux = editStreamUrl.includes('stream.mux.com') || editStreamUrl.includes('mux.dev');
        const muxMatch = editStreamUrl.match(/stream\.mux\.com\/([^/.]+)/);

        await ownerApi(
          `/api/owners/me/watch-links/orgs/${encodeURIComponent(orgShortName)}/channels/${encodeURIComponent(teamSlug)}`,
          token,
          {
            method: 'PATCH',
            body: isMux && muxMatch
              ? { streamType: 'mux_playback', muxPlaybackId: muxMatch[1] }
              : { streamType: 'byo_hls', hlsManifestUrl: editStreamUrl.trim() },
          }
        );
      }

      setEditingKey(null);
      await fetchOrgs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update channel');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  if (!authenticated) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading…</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Watch Links</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your organizations and channels</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/owners/dashboard')}>Dashboard</Button>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="flex justify-end">
          <a href="/owners/watch-links/new">
            <Button>+ Create New Watch Link</Button>
          </a>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading watch links…</p>
          </div>
        ) : orgs.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">No organizations yet. Create your first watch link!</p>
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <CardDescription>Organization: <span className="font-mono">{org.shortName}</span></CardDescription>
              </CardHeader>
              <CardContent>
                {org.channels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No channels yet.</p>
                ) : (
                  <div className="space-y-2">
                    {org.channels.map((ch, idx) => {
                      const key = `${org.shortName}/${ch.teamSlug}`;
                      const isEditing = editingKey === key;
                      const watchUrl = `/watch/${org.shortName}/${ch.teamSlug}`;

                      return (
                        <div key={ch.id}>
                          <div
                            className={`flex items-center justify-between gap-4 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? 'bg-muted/30' : ''}`}
                            onClick={() => startEdit(org, ch)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{ch.displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-mono">{ch.teamSlug}</span>
                                {' · '}
                                <span className={ch.accessMode === 'pay_per_view' ? 'text-green-600' : ''}>
                                  {ch.accessMode === 'pay_per_view' && ch.priceCents ? centsToUsd(ch.priceCents) : 'Free'}
                                </span>
                                {' · '}
                                {ch.streamType}
                              </div>
                              <a
                                href={watchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {watchUrl}
                              </a>
                            </div>
                            <span className="text-muted-foreground text-sm">{isEditing ? '▼' : '▶'}</span>
                          </div>

                          {isEditing && (
                            <div className="px-3 py-4 border-t bg-muted/10 rounded-b-lg">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-w-2xl">
                                <div className="space-y-1 md:col-span-2">
                                  <Label htmlFor="edit-stream-url">Stream URL</Label>
                                  <Input
                                    id="edit-stream-url"
                                    type="url"
                                    placeholder="https://stream.mux.com/... or HLS URL"
                                    value={editStreamUrl}
                                    onChange={(e) => setEditStreamUrl(e.target.value)}
                                  />
                                  <p className="text-xs text-muted-foreground">Mux URLs auto-detected. Leave blank to keep current.</p>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-access">Access Mode</Label>
                                  <select
                                    id="edit-access"
                                    className="border rounded px-2 py-2 text-sm bg-background w-full"
                                    value={editAccessMode}
                                    onChange={(e) => setEditAccessMode(e.target.value)}
                                  >
                                    <option value="public_free">Free</option>
                                    <option value="pay_per_view">Pay Per View</option>
                                  </select>
                                </div>
                                {editAccessMode === 'pay_per_view' && (
                                  <div className="space-y-1">
                                    <Label htmlFor="edit-ch-price">Price (cents)</Label>
                                    <Input
                                      id="edit-ch-price"
                                      type="number"
                                      min={0}
                                      value={editPriceCents}
                                      onChange={(e) => setEditPriceCents(Number(e.target.value))}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button onClick={() => handleSave(org.shortName, ch.teamSlug)} disabled={saving}>
                                  {saving ? 'Saving…' : 'Save Changes'}
                                </Button>
                                <Button variant="ghost" onClick={() => setEditingKey(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
