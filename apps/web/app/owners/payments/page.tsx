'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isPaymentsReady,
  isStepComplete,
  type PaymentsStep,
} from '@/lib/owner-payments-readiness';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

const STEP_LABELS: Record<PaymentsStep, string> = {
  1: 'Start setup',
  2: 'Connect store seller',
};

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OwnerPaymentsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const next = await apiClient.ownerPaymentsStatus(token);
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments status');
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
    if (searchParams.get('payments_connected') === 'true') {
      setJustConnected(true);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (authenticated) void fetchStatus();
  }, [authenticated, fetchStatus]);

  useEffect(() => {
    if (authenticated && searchParams.get('payments_connected') === 'true') {
      void fetchStatus();
    }
  }, [authenticated, searchParams, fetchStatus]);

  async function handleConnect() {
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await apiClient.ownerPaymentsConnect(token);
      window.location.href = resp.onboardingUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start store onboarding');
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('owner_token');
    localStorage.removeItem('owner_token_expires');
    router.push('/owners/login');
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  const phase = status ? getPaymentsReadinessPhase(status) : null;
  const activeStep = status ? getActiveStep(status) : 1;
  const ready = status ? isPaymentsReady(status) : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Payments</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Connect your store seller account to receive payouts for your streams
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/owners/dashboard')}>
                Dashboard
              </Button>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="payments-error" />}

        {justConnected && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
            Store seller connected. You can accept payments when status shows Ready.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12" data-testid="loading-payments">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading payments status…</p>
          </div>
        ) : status ? (
          <>
            <div data-testid="status-payments" className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Status:</span>
              <span className="font-medium text-foreground">{phase ? getPaymentsBadgeLabel(phase) : '—'}</span>
            </div>

            {ready && (
              <div
                data-testid="status-payments-ready"
                className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm font-medium"
              >
                Ready to accept payments
              </div>
            )}

            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Payment setup steps">
              {([1, 2] as PaymentsStep[]).map((step) => {
                const complete = isStepComplete(step, status);
                const active = activeStep === step;
                return (
                  <li
                    key={step}
                    data-testid={step === 1 ? 'step-start' : 'step-connect'}
                    data-complete={complete}
                    data-active={active}
                    className={`rounded-lg border p-3 text-sm ${
                      active ? 'border-primary bg-primary/5' : complete ? 'border-green-200 bg-green-50/50' : 'border-muted bg-muted/30 opacity-70'
                    }`}
                  >
                    <div className="font-medium">
                      Step {step}: {STEP_LABELS[step]}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {complete ? 'Complete' : active ? 'In progress' : 'Pending'}
                    </div>
                  </li>
                );
              })}
            </ol>

            <Card data-testid="card-payments-connect">
              <CardHeader>
                <CardTitle>Connect store seller</CardTitle>
                <CardDescription>
                  Complete Noctusoft store seller onboarding so viewers can pay through your team store (
                  fieldview@your-team). The platform fee is collected automatically at checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.sellerKey && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">Seller key</div>
                    <div className="font-mono text-sm">{status.sellerKey}</div>
                  </div>
                )}
                {status.connected && status.merchantId && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">Merchant ID</div>
                    <div className="font-mono text-sm">{status.merchantId}</div>
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleConnect}
                  disabled={busy || status.connected}
                  className="w-full sm:w-auto"
                  data-testid="btn-connect-payments"
                  data-loading={busy}
                  aria-label="Connect store seller account"
                >
                  {status.connected ? 'Seller connected' : busy ? 'Redirecting…' : 'Connect payments'}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function OwnerPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p>Loading…</p>
        </div>
      }
    >
      <PaymentsInner />
    </Suspense>
  );
}
