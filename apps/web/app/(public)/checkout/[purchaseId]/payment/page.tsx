'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { dataEventBus, DataEvents } from '@/lib/event-bus';

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => {
        card: () => Promise<any>;
        applePay: () => Promise<any>;
        googlePay: () => Promise<any>;
      };
    };
  }
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<any>(null);
  const cardInstanceRef = useRef<any>(null);

  const squareApplicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const squareEnvironment = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  const squareSdkUrl =
    squareEnvironment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

  useEffect(() => {
    if (sdkLoaded && squareApplicationId && squareLocationId && cardRef.current) {
      initializeSquare();
    }
  }, [sdkLoaded, squareApplicationId, squareLocationId]);

  async function initializeSquare() {
    if (!window.Square || !cardRef.current) return;

    try {
      paymentsRef.current = window.Square.payments(squareApplicationId, squareLocationId);
      cardInstanceRef.current = await paymentsRef.current.card();
      await cardInstanceRef.current.attach(cardRef.current);
      setLoading(false);
    } catch (err) {
      setError('Failed to load payment form. Please refresh the page.');
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!cardInstanceRef.current) {
      setError('Payment form not ready');
      return;
    }

    try {
      const tokenResult = await cardInstanceRef.current.tokenize();
      
      if (tokenResult.status === 'OK') {
        const data = await apiClient.processPurchasePayment(purchaseId, { sourceId: tokenResult.token });
        
        // Redirect to watch page or success page
        if (data.entitlementToken) {
          dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, {
            purchaseId,
            entitlementToken: data.entitlementToken,
          });
          router.push(`/watch/${data.entitlementToken}`);
        } else {
          router.push(`/checkout/${purchaseId}/success`);
        }
      } else {
        setError(tokenResult.errors?.[0]?.message || 'Payment failed');
      }
    } catch (err) {
      dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Payment processing failed. Please try again.');
      }
    }
  }

  return (
    <>
      <Script
        src={squareSdkUrl}
        onLoad={() => setSdkLoaded(true)}
        onError={() => {
          setError('Failed to load Square payment SDK');
          setLoading(false);
        }}
      />
      <div className="container mx-auto max-w-md py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Complete Payment</CardTitle>
            <CardDescription>
              Secure payment powered by Square
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <p>Loading payment form...</p>
              </div>
            ) : squareApplicationId && squareLocationId ? (
              <div className="space-y-4">
                <div id="card-container" ref={cardRef} data-testid="square-card-container"></div>
                <Button onClick={handlePayment} className="w-full" data-testid="pay-now">
                  Pay Now
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Square payment configuration is missing.</p>
                <p className="text-sm">Please configure NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
