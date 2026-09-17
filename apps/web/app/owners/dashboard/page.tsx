'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, type OwnerEarningsTotals, type OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
} from '@/lib/owner-payments-readiness';

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [paymentsStatus, setPaymentsStatus] = useState<OwnerPaymentsStatus | null>(null);
  const [earningsTotals, setEarningsTotals] = useState<OwnerEarningsTotals | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [showConnectedToast, setShowConnectedToast] = useState(false);

  const fetchPaymentsStatus = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    try {
      setPaymentsStatus(await apiClient.ownerPaymentsStatus(token));
    } catch {
      setPaymentsStatus(null);
    }
  }, []);

  const fetchEarnings = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setEarningsLoading(true);
    try {
      const ledger = await apiClient.ownerLedger(token);
      setEarningsTotals(ledger.totals);
    } catch {
      setEarningsTotals(null);
    } finally {
      setEarningsLoading(false);
    }
  }, []);

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

    if (searchParams.get('payments_connected') === 'true') {
      setShowConnectedToast(true);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (authenticated) {
      void fetchPaymentsStatus();
      void fetchEarnings();
    }
  }, [authenticated, fetchPaymentsStatus, fetchEarnings]);

  useEffect(() => {
    if (authenticated && searchParams.get('payments_connected') === 'true') {
      void fetchPaymentsStatus();
    }
  }, [authenticated, searchParams, fetchPaymentsStatus]);

  function handleLogout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm sm:text-base text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const badgeLabel = paymentsStatus
    ? getPaymentsBadgeLabel(getPaymentsReadinessPhase(paymentsStatus))
    : 'Not started';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Owner Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your streams and watch links</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              data-testid="btn-logout"
              aria-label="Logout"
              className="shrink-0"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {showConnectedToast && (
          <div
            data-testid="toast-payments-connected"
            className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm flex items-start justify-between gap-4"
            role="status"
          >
            <span>Square account connected successfully!</span>
            <button
              type="button"
              onClick={() => setShowConnectedToast(false)}
              className="text-green-700 hover:text-green-900 font-medium shrink-0"
              aria-label="Dismiss notification"
              data-testid="btn-dismiss-payments-connected"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-interactive" data-testid="card-games">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Games</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your live streams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/games"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-create-game"
              >
                Manage games
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-watch-links">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Watch Links</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Stable URLs for your streams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/watch-links"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-create-watch-link"
              >
                Manage watch links
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-coach">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Coach Dashboard</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage events and teams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                href="/owners/coach"
                className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                data-testid="link-coach-dashboard"
              >
                Open dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-payments">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Payments</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Connect Square &amp; receive payouts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <span
                data-testid="status-payments-badge"
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {badgeLabel}
              </span>
              <div>
                <a
                  href="/owners/payments"
                  className="inline-flex items-center gap-1 text-sm sm:text-base text-primary font-medium hover:underline"
                  data-testid="link-payments"
                >
                  Manage payments
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive" data-testid="card-earnings">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Earnings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gross, platform fee, and your payout</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0" data-loading={earningsLoading}>
              {earningsLoading && (
                <p
                  className="text-xs sm:text-sm text-muted-foreground"
                  data-testid="loading-earnings"
                  aria-live="polite"
                >
                  Loading earnings…
                </p>
              )}
              {!earningsLoading && earningsTotals && earningsTotals.grossCents === 0 && (
                <p
                  className="text-xs sm:text-sm text-muted-foreground"
                  data-testid="empty-earnings"
                  role="status"
                >
                  No paid purchases yet. Earnings will appear here after your first sale.
                </p>
              )}
              {!earningsLoading && earningsTotals && earningsTotals.grossCents > 0 && (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt>Gross</dt>
                    <dd data-testid="earnings-gross" aria-label="Gross earnings">
                      {formatCurrency(earningsTotals.grossCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <dt>Platform fee (~10%)</dt>
                    <dd data-testid="earnings-platform-fee" aria-label="Platform fee">
                      {formatCurrency(earningsTotals.platformFeeCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 font-medium text-primary">
                    <dt>Your payout</dt>
                    <dd data-testid="earnings-net" aria-label="Your payout">
                      {formatCurrency(earningsTotals.ownerNetCents)}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
