'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

type Game = {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  state: string;
  priceCents: number;
  currency: string;
  keywordCode: string;
  qrUrl: string;
};

type GamesResponse = {
  data: Game[];
  pagination: { page: number; limit: number; total: number };
};

function centsToUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const STATE_COLORS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  live: 'bg-green-100 text-green-700',
  ended: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700',
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

  if (method === 'DELETE' && res.status === 204) return undefined as TResponse;

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }

  return (await res.json()) as TResponse;
}

export default function OwnerGamesPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stateFilter, setStateFilter] = useState('');
  const limit = 20;

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editHomeTeam, setEditHomeTeam] = useState('');
  const [editAwayTeam, setEditAwayTeam] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editPriceCents, setEditPriceCents] = useState(0);
  const [editState, setEditState] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGames = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (stateFilter) params.set('state', stateFilter);
      const resp = await ownerApi<GamesResponse>(`/api/owners/games?${params}`, token);
      setGames(resp.data);
      setTotal(resp.pagination.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [page, stateFilter]);

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
    if (authenticated) fetchGames();
  }, [authenticated, fetchGames]);

  function startEdit(game: Game) {
    setEditingId(game.id);
    setEditTitle(game.title);
    setEditHomeTeam(game.homeTeam);
    setEditAwayTeam(game.awayTeam);
    setEditStartsAt(new Date(game.startsAt).toISOString().slice(0, 16));
    setEditPriceCents(game.priceCents);
    setEditState(game.state);
  }

  async function handleSave() {
    if (!editingId) return;
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await ownerApi(`/api/owners/games/${editingId}`, token, {
        method: 'PATCH',
        body: {
          title: editTitle.trim(),
          homeTeam: editHomeTeam.trim(),
          awayTeam: editAwayTeam.trim(),
          startsAt: new Date(editStartsAt).toISOString(),
          priceCents: editPriceCents,
          state: editState,
        },
      });
      setEditingId(null);
      await fetchGames();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update game');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setDeleting(true);
    setError(null);
    try {
      await ownerApi(`/api/owners/games/${deletingId}`, token, { method: 'DELETE' });
      setDeletingId(null);
      await fetchGames();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete game');
    } finally {
      setDeleting(false);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Games</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your games and streams</p>
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
            <Label htmlFor="state-filter" className="text-sm">Status:</Label>
            <select
              id="state-filter"
              className="border rounded px-2 py-1 text-sm bg-background"
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-sm text-muted-foreground">{total} game{total !== 1 ? 's' : ''}</span>
          </div>
          <a href="/owners/games/new">
            <Button>+ Create New Game</Button>
          </a>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading games…</p>
              </div>
            ) : games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No games found. Create your first game!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Title</th>
                      <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Teams</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-right py-2 px-3 font-medium">Price</th>
                      <th className="text-right py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game, idx) => (
                      <>
                        <tr
                          key={game.id}
                          className={`${idx % 2 === 0 ? 'bg-muted/30' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
                          onClick={() => editingId === game.id ? setEditingId(null) : startEdit(game)}
                        >
                          <td className="py-2 px-3 font-medium">{game.title}</td>
                          <td className="py-2 px-3 hidden sm:table-cell text-muted-foreground">{game.homeTeam} vs {game.awayTeam}</td>
                          <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{formatDate(game.startsAt)}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATE_COLORS[game.state] || 'bg-gray-100'}`}>
                              {game.state}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{game.priceCents > 0 ? centsToUsd(game.priceCents) : 'Free'}</td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={(e) => { e.stopPropagation(); setDeletingId(game.id); }}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                        {editingId === game.id && (
                          <tr key={`edit-${game.id}`}>
                            <td colSpan={6} className="px-3 py-4 border-t bg-muted/10">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-3xl">
                                <div className="space-y-1">
                                  <Label htmlFor="edit-title">Title</Label>
                                  <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-home">Home Team</Label>
                                  <Input id="edit-home" value={editHomeTeam} onChange={(e) => setEditHomeTeam(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-away">Away Team</Label>
                                  <Input id="edit-away" value={editAwayTeam} onChange={(e) => setEditAwayTeam(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-starts">Start Time</Label>
                                  <Input id="edit-starts" type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-price">Price (cents)</Label>
                                  <Input id="edit-price" type="number" min={0} value={editPriceCents} onChange={(e) => setEditPriceCents(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor="edit-state">State</Label>
                                  <select id="edit-state" className="border rounded px-2 py-2 text-sm bg-background w-full" value={editState} onChange={(e) => setEditState(e.target.value)}>
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="live">Live</option>
                                    <option value="ended">Ended</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                                <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                              <div className="mt-3 text-xs text-muted-foreground">
                                Keyword: <span className="font-mono">{game.keywordCode}</span> · ID: <span className="font-mono">{game.id}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Delete Game</CardTitle>
              <CardDescription>This action cannot be undone. The game and all associated data will be permanently deleted.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeletingId(null)} disabled={deleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
