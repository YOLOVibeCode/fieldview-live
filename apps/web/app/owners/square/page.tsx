'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type SquareStatus = {
  connected: boolean;
  merchantId: string | null;
  hasRefreshToken: boolean;
  tokenExpiresAt: string | null;
  isExpired: boolean;
  hasLocationId: boolean;
  needsReconnect: boolean;
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

function SquareConnectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SquareStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await ownerApi<SquareStatus>('/api/owners/me/square/status', token);
      setStatus(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Square status');
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

    // Check for post-OAuth callback
    if (searchParams.get('square_connected') === 'true') {
      setJustConnected(true);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (authenticated) fetchStatus();
  }, [authenticated, fetchStatus]);

  async function handleConnect() {
    const token = localStorage.getItem('owner_token');
    if (!token) return;
    setConnecting(true);
    setError(null);
    try {
      const resp = await ownerApi<{ connectUrl: string }>('/api/owners/square/connect', token, {
        body: { returnUrl: `${APP_URL}/owners/square` },
      });
      window.location.href = resp.connectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start Square connection');
      setConnecting(false);
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
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Square Payments</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Connect your Square account to receive payments</p>
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

        {justConnected && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
            Square account connected successfully! You can now receive payments.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading Square status…</p>
          </div>
        ) : status && status.connected && !status.needsReconnect ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Connected</CardTitle>
              <CardDescription>Your Square account is connected and active.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Merchant ID</div>
                  <div className="font-mono text-sm">{status.merchantId || '—'}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Location ID</div>
                  <div className="font-mono text-sm">{status.hasLocationId ? 'Configured' : 'Not set'}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Token Expires</div>
                  <div className="text-sm">{status.tokenExpiresAt ? new Date(status.tokenExpiresAt).toLocaleDateString() : '—'}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="text-sm">{status.isExpired ? 'Expired — reconnect needed' : 'Active'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : status && status.needsReconnect ? (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-600">Reconnection Needed</CardTitle>
              <CardDescription>Your Square connection has expired or needs renewal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Redirecting…' : 'Reconnect Square'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Connect Square</CardTitle>
              <CardDescription>
                Connect your Square account to accept payments from viewers. You&apos;ll be redirected to Square to authorize access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="font-medium mb-2">How it works</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Click &quot;Connect Square&quot; below</li>
                  <li>2. Authorize FieldView on Square&apos;s website</li>
                  <li>3. You&apos;ll be redirected back here</li>
                  <li>4. Start accepting payments for your streams!</li>
                </ul>
              </div>
              <Button onClick={handleConnect} disabled={connecting} className="w-full sm:w-auto">
                {connecting ? 'Redirecting to Square…' : 'Connect Square'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function OwnerSquarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p>Loading…</p></div>}>
      <SquareConnectInner />
    </Suspense>
  );
}
