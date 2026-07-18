'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type AdminPurchaseListItem } from '@/lib/api-client';
import { getAdminSessionToken, clearAdminSessionToken } from '@/lib/admin-session';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-200 text-gray-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-amber-100 text-amber-700',
  partially_refunded: 'bg-amber-100 text-amber-700',
};

export default function AdminPurchasesPage() {
  const router = useRouter();
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<AdminPurchaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  useEffect(() => {
    if (!sessionToken) router.replace('/login');
  }, [router, sessionToken]);

  const fetchPurchases = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.adminListPurchases(sessionToken, {
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        orgShortName: orgSearch.trim() || undefined,
        limit,
        offset,
      });
      setPurchases(resp.purchases);
      setTotal(resp.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, statusFilter, startDate, endDate, orgSearch, offset]);

  useEffect(() => {
    if (sessionToken) fetchPurchases();
  }, [sessionToken, fetchPurchases]);

  function logout() {
    clearAdminSessionToken();
    router.push('/login');
  }

  function applyFilters() {
    setOffset(0);
    fetchPurchases();
  }

  if (!sessionToken) return null;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Purchases</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Browse and filter all purchases</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/console')}>Console</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/revenue')}>Revenue</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/coupons')}>Coupons</Button>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="f-status" className="text-xs">Status</Label>
                <select id="f-status" className="border rounded px-2 py-2 text-sm bg-background w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="created">Created</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="partially_refunded">Partially Refunded</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-start" className="text-xs">From</Label>
                <Input id="f-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-end" className="text-xs">To</Label>
                <Input id="f-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-org" className="text-xs">Org Short Name</Label>
                <Input id="f-org" placeholder="e.g. STORMFC" value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Purchases</CardTitle>
            <CardDescription>{total} purchase{total !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading purchases…</p>
              </div>
            ) : purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No purchases found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Viewer</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Game</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Gross</th>
                      <th className="text-right py-2 px-3 font-medium hidden lg:table-cell">Fees</th>
                      <th className="text-right py-2 px-3 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`${idx % 2 === 0 ? 'bg-muted/30' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => router.push(`/purchases/${p.id}`)}
                      >
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                        <td className="py-2 px-3">{p.viewer.email}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{p.game.title}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right hidden sm:table-cell">{formatCents(p.gross)}</td>
                        <td className="py-2 px-3 text-right hidden lg:table-cell text-muted-foreground">
                          {formatCents(p.processorFee + p.platformFee)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-green-600">{formatCents(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)}>Next</Button>
          </div>
        )}
      </main>
    </div>
  );
}
