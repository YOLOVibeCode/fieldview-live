'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { dataEventBus, DataEvents } from '@/lib/event-bus';
import { watchPathFromPurchaseStatus } from '@/lib/checkout-return';

const POLL_INTERVAL_MS = 2000;
// The store's webhook normally lands within seconds; after this, stop polling
// and point the viewer to the receipt email, which carries the same watch link.
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

type Outcome = 'pending' | 'paid' | 'failed' | 'unconfirmed';

export default function CheckoutSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;

  const [entitlementToken, setEntitlementToken] = useState<string | null>(null);
  const [watchPath, setWatchPath] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>('pending');

  useEffect(() => {
    if (!purchaseId) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    // Poll for purchase status and get entitlement token
    async function checkPurchaseStatus() {
      try {
        const data = await apiClient.getPurchaseStatus(purchaseId);
        if (cancelled) return;
        if (data.status === 'paid' && data.entitlementToken) {
          setEntitlementToken(data.entitlementToken);
          setWatchPath(watchPathFromPurchaseStatus(data));
          dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, {
            purchaseId,
            entitlementToken: data.entitlementToken,
          });
          setOutcome('paid');
          return;
        }

        if (data.status === 'failed') {
          dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
          setOutcome('failed');
          return;
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          setOutcome('unconfirmed');
          return;
        }
        timer = setTimeout(() => void checkPurchaseStatus(), POLL_INTERVAL_MS);
      } catch {
        // Don't claim success we can't confirm.
        if (!cancelled) setOutcome('unconfirmed');
      }
    }

    void checkPurchaseStatus();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [purchaseId]);

  if (outcome === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 gradient-primary">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Processing Payment...</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Please wait while we confirm your payment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (outcome === 'failed' || outcome === 'unconfirmed') {
    const failed = outcome === 'failed';
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 gradient-primary">
        <Card
          className="w-full max-w-md shadow-lg"
          data-testid={failed ? 'checkout-failed' : 'checkout-pending-timeout'}
        >
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl sm:text-2xl">
              {failed ? "Payment didn't go through" : 'Still confirming your payment'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {failed
                ? 'You were not charged. Go back to the stream to try again.'
                : "This is taking longer than usual. If the payment went through, your receipt email has your watch link. You don't need to pay again."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button variant="outline" className="w-full" onClick={() => router.push('/')} aria-label="Go to home page">
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 gradient-primary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-green-600 dark:text-green-400">Payment Successful!</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {entitlementToken ? (
            <p className="text-sm sm:text-base text-muted-foreground">
              You can now access the stream.
            </p>
          ) : (
            <p className="text-sm sm:text-base text-muted-foreground">
              Your stream access will be available shortly. Check your email for the watch link.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2">
          {entitlementToken && watchPath && (
            <Button
              className="w-full text-base sm:text-lg py-3"
              size="lg"
              onClick={() => router.push(watchPath)}
              aria-label="Watch stream"
              data-testid="btn-watch-stream"
            >
              Watch Stream
            </Button>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push('/')} 
            aria-label="Go to home page"
          >
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
