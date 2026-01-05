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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Admin Console</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Search-first support tooling</p>
            </div>
            <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0">
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Global Search</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Search by email, phone (E.164), keyword, game/purchase IDs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="admin-search-q"
                aria-label="Global Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && q.trim().length > 0 && !loading) {
                    runSearch();
                  }
                }}
                placeholder="e.g. parent@example.com, +15551234567, EAGLES22…"
                className="h-11 sm:h-12 text-base flex-1"
              />
              <Button 
                onClick={runSearch} 
                disabled={loading || q.trim().length === 0} 
                aria-label="Search"
                className="h-11 sm:h-12 px-6 sm:w-auto w-full"
              >
                {loading ? 'Searching…' : 'Search'}
              </Button>
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 sm:p-4 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

      {results && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Viewers</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Matches by email/phone</CardDescription>
            </CardHeader>
            <CardContent>
              {results.viewers?.length ? (
                <div className="space-y-3">
                  {results.viewers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm sm:text-base font-medium">{v.email}</div>
                        <div className="truncate text-xs sm:text-sm text-muted-foreground">{v.phoneE164 || '—'}</div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground shrink-0">{v.purchaseCount ?? 0} purchases</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">No viewer matches.</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Games</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Matches by keyword/title</CardDescription>
            </CardHeader>
            <CardContent>
              {results.games?.length ? (
                <div className="space-y-3">
                  {results.games.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm sm:text-base font-medium">{g.title}</div>
                        <div className="truncate text-xs sm:text-sm text-muted-foreground">{g.keywordCode}</div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate shrink-0">{g.ownerAccountName || '—'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">No game matches.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {results?.purchases?.length ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Purchases</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Matches by ID or viewer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.purchases.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => router.push(`/purchases/${p.id}`)}
                  aria-label={`View purchase ${p.id}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm sm:text-base font-medium">{p.gameTitle}</div>
                      <div className="truncate text-xs sm:text-sm text-muted-foreground">{p.viewerEmail}</div>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground shrink-0">{p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      </main>
    </div>
  );
}


