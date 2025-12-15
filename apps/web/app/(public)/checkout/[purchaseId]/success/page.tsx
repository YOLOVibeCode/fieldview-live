'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

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
        // Note: This endpoint doesn't exist yet, but will be implemented
        // For now, we'll redirect to a generic success page
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/public/purchases/${purchaseId}/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'paid' && data.entitlementToken) {
            setEntitlementToken(data.entitlementToken);
            setLoading(false);
          } else {
            // Poll again after delay
            setTimeout(checkPurchaseStatus, 2000);
          }
        } else {
          // If endpoint doesn't exist, just show success
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to check purchase status:', err);
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
            >
              Watch Stream
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
