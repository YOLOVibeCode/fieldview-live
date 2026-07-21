'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type OwnerPaymentsStatus } from '@/lib/api-client';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OwnerPaymentsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [locationId, setLocationId] = useState('');
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
    if (searchParams.get('payments_connected') === 'true') setJustConnected(true);
  }, [router, searchParams]);

  useEffect(() => {
    if (authenticated) void fetchStatus();
  }, [authenticated, fetchStatus]);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Payouts</h1>
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
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading payouts status…</p>
          </div>
        ) : status && !status.agreementAccepted ? (
          <Card data-testid="card-agreement">
            <CardHeader>
              <CardTitle>Accept the Recipient Agreement</CardTitle>
              <CardDescription>
                Before connecting Square, please review and accept the{' '}
                <a href="/legal/recipient-agreement" className="underline" target="_blank" rel="noreferrer">
                  Recipient Agreement
                </a>
                . This covers how payouts and the platform fee work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleAcceptAgreement} disabled={busy} data-testid="btn-accept-agreement">
                {busy ? 'Saving…' : 'Accept & Continue'}
              </Button>
            </CardContent>
          </Card>
        ) : status && !status.connected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Square</CardTitle>
              <CardDescription>
                Connect your own Square account to receive payouts. Viewers&apos; payments go directly to your Square
                balance; FieldView keeps a small platform fee. You&apos;ll be redirected to Square to authorize.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="font-medium mb-2">How it works</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Click &quot;Connect Square&quot; below</li>
                  <li>2. Authorize FieldView on Square&apos;s website</li>
                  <li>3. You&apos;ll be redirected back here</li>
                  <li>4. Add your Square Location ID to finish</li>
                </ul>
              </div>
              <Button onClick={handleConnect} disabled={busy} className="w-full sm:w-auto" data-testid="btn-connect-payments">
                {busy ? 'Redirecting to Square…' : 'Connect Square'}
              </Button>
            </CardContent>
          </Card>
        ) : status ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Connected</CardTitle>
              <CardDescription>Your Square account is connected. Payouts settle directly to your Square balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Merchant ID</div>
                  <div className="font-mono text-sm">{status.merchantId || '—'}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Connected</div>
                  <div className="text-sm">
                    {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-id">Square Location ID</Label>
                <p className="text-xs text-muted-foreground">
                  Find this in your Square Dashboard → Account &amp; Settings → Locations. Required for checkout.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="location-id"
                    data-testid="input-location-id"
                    placeholder="e.g. LSWR97SDRBXWK"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="sm:max-w-xs"
                  />
                  <Button onClick={handleSaveLocation} disabled={busy || !locationId.trim()} data-testid="btn-save-location">
                    {busy ? 'Saving…' : 'Save Location'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
