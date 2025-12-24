'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { dataEventBus, DataEvents } from '@/lib/event-bus';

export default function CheckoutSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;

  const [entitlementToken, setEntitlementToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Poll for purchase status and get entitlement token
    async function checkPurchaseStatus() {
      try {
        const data = await apiClient.getPurchaseStatus(purchaseId);
        if (data.status === 'paid' && data.entitlementToken) {
          setEntitlementToken(data.entitlementToken);
          dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, {
            purchaseId,
            entitlementToken: data.entitlementToken,
          });
          setLoading(false);
          return;
        }

        if (data.status === 'failed') {
          dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
          setLoading(false);
          return;
        }

        // Poll again after delay
        setTimeout(checkPurchaseStatus, 2000);
      } catch (err) {
        // Best-effort: show generic success state if status polling fails.
        setLoading(false);
      }
    }

    if (purchaseId) {
      checkPurchaseStatus();
    }
  }, [purchaseId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Payment...</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entitlementToken ? (
            <p className="text-sm text-muted-foreground">
              You can now access the stream.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your stream access will be available shortly. Check your email for the watch link.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {entitlementToken && (
            <Button
              className="w-full"
              onClick={() => router.push(`/watch/${entitlementToken}`)}
              aria-label="Watch stream"
            >
              Watch Stream
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => router.push('/')} aria-label="Go to home page">
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
