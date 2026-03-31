'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type DirectStream = {
  id: string;
  slug: string;
  title: string;
  status: string;
  streamUrl?: string;
  scheduledStartAt?: string;
  paywallEnabled: boolean;
  priceInCents: number;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  listed: boolean;
  createdAt: string;
};

function centsToUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
  deleted: 'bg-red-100 text-red-700',
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

export default function OwnerDirectStreamsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<DirectStream[]>([]);
  const [statusFilter, setStatusFilter] = useState('active');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStreamUrl, setEditStreamUrl] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editChat, setEditChat] = useState(true);
  const [editScoreboard, setEditScoreboard] = useState(false);
  const [editPaywall, setEditPaywall] = useState(false);
  const [editPrice, setEditPrice] = useState(0);
  const [editListed, setEditListed] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create drawer
  const [showCreate, setShowCreate] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Archive
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await ownerApi<{ streams: DirectStream[] }>(
        `/api/owners/direct-streams?status=${statusFilter}`,
        token
      );
      setStreams(resp.streams);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
    if (authenticated) fetchStreams();
  }, [authenticated, fetchStreams]);

  function startEdit(s: DirectStream) {
    if (editingId === s.id) { setEditingId(null); return; }
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditStreamUrl(s.streamUrl || '');
    setEditScheduledAt(s.scheduledStartAt ? new Date(s.scheduledStartAt).toISOString().slice(0, 16) : '');
    setEditChat(s.chatEnabled);
    setEditScoreboard(s.scoreboardEnabled);
    setEditPaywall(s.paywallEnabled);
    setEditPrice(s.priceInCents);
    setEditListed(s.listed);
  }

  async function handleSave() {
    if (!editingId) return;
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await ownerApi(`/api/owners/direct-streams/${editingId}`, token, {
        method: 'PATCH',
        body: {
          title: editTitle.trim(),
          streamUrl: editStreamUrl.trim() || null,
          scheduledStartAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
          chatEnabled: editChat,
          scoreboardEnabled: editScoreboard,
          paywallEnabled: editPaywall,
          priceInCents: editPrice,
          listed: editListed,
        },
      });
      setEditingId(null);
      await fetchStreams();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update stream');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      await ownerApi('/api/owners/direct-streams', token, {
        body: {
          slug: newSlug.trim().toLowerCase(),
          title: newTitle.trim(),
          adminPassword: newPassword,
          streamUrl: newStreamUrl.trim() || undefined,
          chatEnabled: true,
          scoreboardEnabled: false,
        },
      });
      setShowCreate(false);
      setNewSlug('');
      setNewTitle('');
      setNewPassword('');
      setNewStreamUrl('');
      await fetchStreams();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setArchivingId(id);
    setError(null);
    try {
      await ownerApi(`/api/owners/direct-streams/${id}/archive`, token, { method: 'POST', body: {} });
      await fetchStreams();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive stream');
    } finally {
      setArchivingId(null);
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
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Direct Streams</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your direct stream pages</p>
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

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="ds-status" className="text-sm">Status:</Label>
            <select
              id="ds-status"
              className="border rounded px-2 py-1 text-sm bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <span className="text-sm text-muted-foreground">{streams.length} stream{streams.length !== 1 ? 's' : ''}</span>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Create Direct Stream'}
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Create Direct Stream</CardTitle>
              <CardDescription>Set up a new direct stream page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-w-2xl">
                <div className="space-y-1">
                  <Label htmlFor="new-slug">Slug</Label>
                  <Input id="new-slug" placeholder="my-stream" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Lowercase, alphanumeric, hyphens only</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-title">Title</Label>
                  <Input id="new-title" placeholder="My Stream" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">Admin Password</Label>
                  <Input id="new-password" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-stream-url">Stream URL (optional)</Label>
                  <Input id="new-stream-url" type="url" placeholder="https://stream.mux.com/..." value={newStreamUrl} onChange={(e) => setNewStreamUrl(e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleCreate} disabled={creating || !newSlug.trim() || !newTitle.trim() || newPassword.length < 8}>
                  {creating ? 'Creating…' : 'Create Stream'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading streams…</p>
          </div>
        ) : streams.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">No direct streams found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Slug</th>
                      <th className="text-left py-2 px-3 font-medium">Title</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Scheduled</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-center py-2 px-3 font-medium hidden sm:table-cell">Features</th>
                      <th className="text-right py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streams.map((s, idx) => (
                      <>
                        <tr
                          key={s.id}
                          className={`${idx % 2 === 0 ? 'bg-muted/30' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
                          onClick={() => startEdit(s)}
                        >
                          <td className="py-2 px-3">
                            <a href={`/direct/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                              {s.slug}
                            </a>
                          </td>
                          <td className="py-2 px-3 font-medium">{s.title}</td>
                          <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{s.scheduledStartAt ? formatDate(s.scheduledStartAt) : '—'}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>{s.status}</span>
                          </td>
                          <td className="py-2 px-3 text-center hidden sm:table-cell text-xs">
                            {s.chatEnabled ? '💬' : ''} {s.scoreboardEnabled ? '📊' : ''} {s.paywallEnabled ? `💰${centsToUsd(s.priceInCents)}` : ''}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {s.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-yellow-600"
                                disabled={archivingId === s.id}
                                onClick={(e) => { e.stopPropagation(); handleArchive(s.id); }}
                              >
                                {archivingId === s.id ? '…' : 'Archive'}
                              </Button>
                            )}
                          </td>
                        </tr>
                        {editingId === s.id && (
                          <tr key={`edit-${s.id}`}>
                            <td colSpan={6} className="px-3 py-4 border-t bg-muted/10">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
                                <div className="space-y-1">
                                  <Label>Title</Label>
                                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                  <Label>Stream URL</Label>
                                  <Input type="url" value={editStreamUrl} onChange={(e) => setEditStreamUrl(e.target.value)} placeholder="HLS or Mux URL" />
                                </div>
                                <div className="space-y-1">
                                  <Label>Scheduled Start</Label>
                                  <Input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Price (cents)</Label>
                                  <Input type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
                                </div>
                                <div className="space-y-3 pt-2">
                                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editChat} onChange={(e) => setEditChat(e.target.checked)} /> Chat</label>
                                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editScoreboard} onChange={(e) => setEditScoreboard(e.target.checked)} /> Scoreboard</label>
                                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editPaywall} onChange={(e) => setEditPaywall(e.target.checked)} /> Paywall</label>
                                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editListed} onChange={(e) => setEditListed(e.target.checked)} /> Listed</label>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                                <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
