'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiClient, ApiError, type AdminSearchResults } from '@/lib/api-client';
import { clearAdminSessionToken, getAdminSessionToken } from '@/lib/admin-session';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AdminConsolePage() {
  const router = useRouter();
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminSearchResults | null>(null);

  useEffect(() => {
    if (!sessionToken) router.replace('/login');
  }, [router, sessionToken]);

  async function runSearch() {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.adminSearch(sessionToken, q.trim());
      setResults(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Search failed.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearAdminSessionToken();
    dataEventBus.emit(DataEvents.USER_UPDATED, { kind: 'admin', adminAccount: null });
    router.push('/login');
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Search-first support tooling</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Search</CardTitle>
          <CardDescription>Search by email, phone (E.164), keyword, game/purchase IDs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. parent@example.com, +15551234567, EAGLES22, purchase UUID…"
            />
            <Button onClick={runSearch} disabled={loading || q.trim().length === 0}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

      {results && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Viewers</CardTitle>
              <CardDescription>Matches by email/phone</CardDescription>
            </CardHeader>
            <CardContent>
              {results.viewers?.length ? (
                <div className="space-y-2 text-sm">
                  {results.viewers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{v.email}</div>
                        <div className="truncate text-muted-foreground">{v.phoneE164 || '—'}</div>
                      </div>
                      <div className="text-muted-foreground">{v.purchaseCount ?? 0} purchases</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No viewer matches.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Games</CardTitle>
              <CardDescription>Matches by keyword/title</CardDescription>
            </CardHeader>
            <CardContent>
              {results.games?.length ? (
                <div className="space-y-2 text-sm">
                  {results.games.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{g.title}</div>
                        <div className="truncate text-muted-foreground">{g.keywordCode}</div>
                      </div>
                      <div className="text-muted-foreground truncate">{g.ownerAccountName || '—'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No game matches.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {results?.purchases?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchases</CardTitle>
            <CardDescription>Matches by ID or viewer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {results.purchases.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left rounded-md border p-3 hover:bg-muted"
                  onClick={() => router.push(`/purchases/${p.id}`)}
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.gameTitle}</div>
                      <div className="truncate text-muted-foreground">{p.viewerEmail}</div>
                    </div>
                    <div className="text-muted-foreground">{p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


