'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { apiClient, ApiError, type PlatformRevenueResponse } from '@/lib/api-client';
import { clearAdminSessionToken, getAdminSessionToken } from '@/lib/admin-session';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function RevenueDashboardPage() {
  const router = useRouter();
  const sessionToken = useMemo(() => getAdminSessionToken(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformRevenueResponse | null>(null);

  useEffect(() => {
    if (!sessionToken) {
      router.replace('/login');
      return;
    }

    async function fetchStats() {
      try {
        const data = await apiClient.adminGetPlatformRevenue(sessionToken!);
        setStats(data);
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
        else setError('Failed to load revenue data.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [router, sessionToken]);

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
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Platform Revenue</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                FieldView platform earnings dashboard
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/console">
                <Button variant="ghost" size="sm">Console</Button>
              </Link>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading revenue data...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Platform Revenue (All Time)</CardDescription>
                  <CardTitle className="text-2xl font-bold text-green-600">
                    {formatCents(stats.totalPlatformRevenueCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalPurchases.toLocaleString()} total purchases
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">This Month</CardDescription>
                  <CardTitle className="text-2xl font-bold">
                    {formatCents(stats.thisMonthRevenueCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Platform fees collected</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">This Week</CardDescription>
                  <CardTitle className="text-2xl font-bold">
                    {formatCents(stats.thisWeekRevenueCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Platform fees collected</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Gross Volume</CardDescription>
                  <CardTitle className="text-2xl font-bold">
                    {formatCents(stats.totalGrossRevenueCents)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Processor fees: {formatCents(stats.totalProcessorFeeCents)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue</CardTitle>
                <CardDescription>Platform fees collected by month</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.revenueByMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.revenueByMonth.map((row) => (
                      <div key={row.month} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{formatMonth(row.month)}</div>
                          <div className="text-sm text-muted-foreground">
                            {row.purchaseCount} purchase{row.purchaseCount !== 1 ? 's' : ''} &middot; {formatCents(row.grossCents)} gross
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-green-600">{formatCents(row.platformFeeCents)}</div>
                          <div className="text-xs text-muted-foreground">platform fee</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Owners */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Top Owners by Revenue</CardTitle>
                <CardDescription>Owners generating the most platform revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topOwners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No owner data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium">Owner</th>
                          <th className="text-right py-2 px-2 font-medium">Purchases</th>
                          <th className="text-right py-2 px-2 font-medium">Gross</th>
                          <th className="text-right py-2 px-2 font-medium">Platform Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topOwners.map((owner, idx) => (
                          <tr key={owner.ownerAccountId} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                            <td className="py-2 px-2">
                              <div className="font-medium truncate max-w-[200px]">{owner.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{owner.contactEmail}</div>
                            </td>
                            <td className="text-right py-2 px-2">{owner.purchaseCount}</td>
                            <td className="text-right py-2 px-2">{formatCents(owner.grossCents)}</td>
                            <td className="text-right py-2 px-2 font-semibold text-green-600">
                              {formatCents(owner.platformFeeCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
