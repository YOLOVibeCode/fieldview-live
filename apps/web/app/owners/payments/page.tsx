'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isPaymentsReady,
  isStepComplete,
  markLocationSavedInSession,
  readLocationSavedFromSession,
  type PaymentsStep,
} from '@/lib/owner-payments-readiness';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

const STEP_LABELS: Record<PaymentsStep, string> = {
  1: 'Accept agreement',
  2: 'Connect Square',
  3: 'Add location',
};

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OwnerPaymentsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [locationSaved, setLocationSaved] = useState(readLocationSavedFromSession);
  const [justConnected, setJustConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await apiClient.ownerPaymentsStatus(token));
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

  async function handleAcceptAgreement() {
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.ownerAcceptAgreement(token, undefined);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record agreement');
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await apiClient.ownerPaymentsConnect(token);
      window.location.href = resp.authorizeUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start Square connection');
      setBusy(false);
    }
  }

  async function handleSaveLocation() {
    const token = getOwnerToken();
    if (!token || !locationId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.ownerSetPaymentLocation(token, locationId.trim());
      markLocationSavedInSession();
      setLocationSaved(true);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save location');
    } finally {
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

  const phase = status ? getPaymentsReadinessPhase(status, locationSaved) : null;
  const activeStep = status ? getActiveStep(status, locationSaved) : 1;
  const ready = status ? isPaymentsReady(status, locationSaved) : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Payments</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Connect your Square account to receive payouts for your streams
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
            Square account connected! Add your Location ID below to finish.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12" data-testid="loading-payments">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading payments status…</p>
          </div>
        ) : status ? (
          <>
            <div
              data-testid="status-payments"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
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

            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Payment setup steps">
              {([1, 2, 3] as PaymentsStep[]).map((step) => {
                const complete = isStepComplete(step, status, locationSaved);
                const active = activeStep === step;
                const stepId =
                  step === 1 ? 'step-agreement' : step === 2 ? 'step-connect' : 'step-location';
                return (
                  <li
                    key={step}
                    data-testid={stepId}
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

            <Card data-testid="card-agreement" className={activeStep !== 1 && !status.agreementAccepted ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle>Step 1: Accept the Recipient Agreement</CardTitle>
                <CardDescription>
                  Before connecting Square, please review and accept the{' '}
                  <a href="/legal/recipient-agreement" className="underline" target="_blank" rel="noreferrer">
                    Recipient Agreement
                  </a>
                  . This covers how payouts and the platform fee work.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleAcceptAgreement}
                  disabled={busy || status.agreementAccepted}
                  data-testid="btn-accept-agreement"
                  data-loading={busy}
                  aria-label="Accept recipient agreement"
                >
                  {status.agreementAccepted ? 'Agreement accepted' : busy ? 'Saving…' : 'Accept & Continue'}
                </Button>
              </CardContent>
            </Card>

            <Card className={!status.agreementAccepted ? 'opacity-60 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle>Step 2: Connect Square</CardTitle>
                <CardDescription>
                  Connect your own Square account to receive payouts. Viewers&apos; payments go directly to your Square
                  balance; FieldView keeps a small platform fee. You&apos;ll be redirected to Square to authorize.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.connected && status.merchantId && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">Merchant ID</div>
                    <div className="font-mono text-sm">{status.merchantId}</div>
                  </div>
                )}
                <Button
                  onClick={handleConnect}
                  disabled={busy || !status.agreementAccepted || status.connected}
                  className="w-full sm:w-auto"
                  data-testid="btn-connect-square"
                  data-loading={busy}
                  aria-label="Connect Square account"
                >
                  {status.connected ? 'Square connected' : busy ? 'Redirecting to Square…' : 'Connect Square'}
                </Button>
              </CardContent>
            </Card>

            <Card className={!status.connected ? 'opacity-60 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle>Step 3: Square Location ID</CardTitle>
                <CardDescription>
                  Find this in your Square Dashboard → Account &amp; Settings → Business → Locations. Required for
                  checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="location-id">Square Location ID</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="location-id"
                    data-testid="input-location-id"
                    placeholder="e.g. LSWR97SDRBXWK"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="sm:max-w-xs"
                    disabled={!status.connected}
                    aria-describedby="location-id-help"
                  />
                  <Button
                    onClick={handleSaveLocation}
                    disabled={busy || !status.connected || !locationId.trim()}
                    data-testid="btn-save-location"
                    data-loading={busy}
                    aria-label="Save Square location ID"
                  >
                    {busy ? 'Saving…' : locationSaved ? 'Location saved' : 'Save Location'}
                  </Button>
                </div>
                <p id="location-id-help" className="text-xs text-muted-foreground">
                  Square Dashboard → Account &amp; Settings → Business → Locations
                </p>
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
