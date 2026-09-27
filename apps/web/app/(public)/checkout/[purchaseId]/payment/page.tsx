'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { parseDirectStreamReturnPath } from '@/lib/checkout-return';
import { ErrorBanner } from '@/components/v2/ErrorBanner';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = params.purchaseId as string;
  const returnUrlParam = searchParams.get('returnUrl');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const pollAndFinish = useCallback(async () => {
    const status = await apiClient.getPurchaseStatus(purchaseId);
    if (status.status === 'paid') {
      router.push(`/checkout/${purchaseId}/success`);
      return true;
    }
    return false;
  }, [purchaseId, router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (searchParams.get('cancelled') === '1') {
          setError('Payment was cancelled. You can try again when ready.');
          setLoading(false);
          return;
        }

        const paid = await pollAndFinish();
        if (paid || cancelled) {
          setLoading(false);
          return;
        }

        const returnUrl =
          parseDirectStreamReturnPath(returnUrlParam) ||
          (returnUrlParam && returnUrlParam.startsWith('http') ? returnUrlParam : undefined);

        setRedirecting(true);
        const session = await apiClient.createPurchaseCheckoutSession(purchaseId, { returnUrl });
        if (cancelled) return;
        window.location.href = session.checkoutUrl;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Checkout failed');
          setLoading(false);
        }
      }
    })();

    const interval = window.setInterval(() => {
      void pollAndFinish();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [purchaseId, pollAndFinish, returnUrlParam, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="page-checkout-payment">
      <Card className="w-full max-w-md" data-testid="card-checkout-payment">
        <CardHeader>
          <CardTitle>Complete payment</CardTitle>
          <CardDescription>You will be redirected to the secure store checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="error-payment" />}
          {(loading || redirecting) && (
            <div className="text-center py-8" data-testid="loading-payment" data-loading="true">
              <p className="text-muted-foreground">
                {redirecting ? 'Redirecting to checkout…' : 'Preparing checkout…'}
              </p>
            </div>
          )}
          {error && (
            <Button
              type="button"
              className="w-full"
              data-testid="btn-retry-checkout"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
