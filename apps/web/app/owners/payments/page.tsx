'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { apiClient, type OwnerPaymentsStatus } from '@/lib/api-client';
import {
  getActiveStep,
  getPaymentsBadgeLabel,
  getPaymentsReadinessPhase,
  isAgreementAccepted,
  isPaymentsReady,
  isStepComplete,
  type PaymentsStep,
} from '@/lib/owner-payments-readiness';

function getOwnerToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('owner_token');
}

const STEP_LABELS: Record<PaymentsStep, string> = {
  1: 'Accept the Recipient Agreement',
  2: 'Connect payouts',
};

const STEP_TEST_IDS: Record<PaymentsStep, string> = {
  1: 'step-agreement',
  2: 'step-connect',
};

const SELLER_STATUS_LABELS: Record<string, string> = {
  not_connected: 'Not connected',
  pending: 'Pending review',
  active: 'Active',
  restricted: 'Restricted',
  disconnected: 'Disconnected',
  action_required: 'Action required',
};

function sellerStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Not connected';
  return SELLER_STATUS_LABELS[status] || status;
}

type ReturnNotice = { kind: 'connected' | 'pending' } | { kind: 'failed'; code: string };

/** What the relay appended when it sent the coach back from the provider's form. */
function readReturnNotice(params: URLSearchParams): ReturnNotice | null {
  const seller = params.get('seller');
  if (seller === 'connected' || seller === 'pending') return { kind: seller };
  if (seller === 'failed') return { kind: 'failed', code: params.get('code') || 'UNKNOWN' };
  if (params.get('payments_connected') === 'true') return { kind: 'connected' };
  return null;
}

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OwnerPaymentsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);
  // Derived, not state: a new object per render in an effect would never settle.
  const notice = useMemo(() => readReturnNotice(searchParams), [searchParams]);

  const fetchStatus = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    setLoading(true);
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
    if (notice?.kind === 'failed') {
      setError(`Payout setup did not complete at the provider (${notice.code}). You can start it again below.`);
    }
  }, [router, notice]);

  useEffect(() => {
    if (authenticated) void fetchStatus();
  }, [authenticated, fetchStatus]);

  async function handleAcceptAgreement() {
    const token = getOwnerToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.ownerPaymentsAcceptAgreement(token);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record the agreement');
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
      window.location.href = resp.onboardingUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start payout onboarding');
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
  const agreementAccepted = status ? isAgreementAccepted(status) : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Payments</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Get paid for your streams: viewers pay on the Noctusoft Store and the money goes to your own payout account
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push('/owners/dashboard')} data-testid="link-dashboard">
                Dashboard
              </Button>
              <Button variant="outline" onClick={logout} aria-label="Sign out" className="shrink-0" data-testid="btn-logout">
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="payments-error" />}

        {notice?.kind === 'connected' && !loading && status?.connected && (
          <div
            data-testid="notice-seller-connected"
            className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm"
          >
            Payouts connected. Viewers can pay for your streams as soon as the status below shows Ready.
          </div>
        )}

        {(notice?.kind === 'pending' || (notice?.kind === 'connected' && !loading && status && !status.connected)) && (
          <div
            data-testid="notice-seller-pending"
            className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm"
          >
            Your details are with the payment provider for review. This page updates on its own once charges are enabled;
            if the provider needs more from you, use Connect payments again to open its form.
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
                    data-testid={STEP_TEST_IDS[step]}
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

            <Card data-testid="card-agreement" className={agreementAccepted ? 'opacity-80' : ''}>
              <CardHeader>
                <CardTitle>Step 1: Recipient Agreement</CardTitle>
                <CardDescription>How payments work before you connect a payout account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Viewers pay on the Noctusoft Store. Each payment settles to your own payout account, never to FieldView.</li>
                  <li>FieldView keeps a 10% platform fee on each sale. Card processing fees come out of your side.</li>
                  <li>Refunds and disputes are handled on your account; a full refund ends the viewer&apos;s access.</li>
                </ul>
                <a
                  href="/legal/recipient-agreement"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm text-primary underline"
                  data-testid="link-recipient-agreement"
                >
                  Read the full Recipient Agreement
                </a>
                {agreementAccepted ? (
                  <p className="text-sm text-green-800" data-testid="text-agreement-accepted">
                    Agreement accepted{status.agreementVersion ? ` (${status.agreementVersion})` : ''}
                    {status.agreementAcceptedAt ? ` on ${new Date(status.agreementAcceptedAt).toLocaleDateString()}` : ''}.
                  </p>
                ) : (
                  <>
                    {status.agreementVersion &&
                    status.agreementCurrentVersion &&
                    status.agreementVersion !== status.agreementCurrentVersion ? (
                      <p className="text-sm text-amber-800" data-testid="notice-agreement-stale">
                        You accepted version {status.agreementVersion}. Version {status.agreementCurrentVersion} replaces
                        it: please read and accept the new version. Your payouts keep working in the meantime.
                      </p>
                    ) : null}
                    <label className="flex items-start gap-2 text-sm" htmlFor="agree">
                      <input
                        id="agree"
                        type="checkbox"
                        className="mt-1"
                        checked={agreeChecked}
                        onChange={(e) => setAgreeChecked(e.target.checked)}
                        data-testid="checkbox-agree"
                      />
                      <span>I have read and accept the Recipient Agreement.</span>
                    </label>
                    <Button
                      type="button"
                      onClick={handleAcceptAgreement}
                      disabled={busy || !agreeChecked}
                      className="w-full sm:w-auto"
                      data-testid="btn-accept-agreement"
                      data-loading={busy}
                      aria-label="Accept the Recipient Agreement"
                    >
                      {busy ? 'Saving…' : 'Accept & continue'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-payments-connect" className={!agreementAccepted ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle>Step 2: Connect payouts</CardTitle>
                <CardDescription>
                  Connect the account your payouts go to. You&apos;ll fill in your details on the payment provider&apos;s
                  secure form and come straight back here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Payout account</div>
                  <div className="font-medium" data-testid="text-seller-status">
                    {sellerStatusLabel(status.status)}
                    {status.mode === 'test' ? ' · test mode' : ''}
                  </div>
                  {status.connected && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Charges {status.chargesEnabled ? 'enabled' : 'disabled'} · Payouts {status.payoutsEnabled ? 'enabled' : 'pending'}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleConnect}
                  disabled={busy || !agreementAccepted || status.connected}
                  className="w-full sm:w-auto"
                  data-testid="btn-connect-payments"
                  data-loading={busy}
                  aria-label="Connect payout account"
                >
                  {status.connected ? 'Payouts connected' : busy ? 'Redirecting…' : 'Connect payments'}
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
