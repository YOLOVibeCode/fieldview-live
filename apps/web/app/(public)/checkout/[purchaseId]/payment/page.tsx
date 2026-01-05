'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { dataEventBus, DataEvents } from '@/lib/event-bus';

interface SquareTokenizeResult {
  status: 'OK' | 'ERROR';
  token: string;
  errors?: Array<{ message?: string }>;
}

interface SquarePaymentMethod {
  attach: (element: HTMLElement) => Promise<void>;
  tokenize: () => Promise<SquareTokenizeResult>;
  destroy?: () => void;
}

interface SquarePayments {
  card: () => Promise<SquarePaymentMethod>;
  applePay: (opts: { countryCode: string; currencyCode: string; amount: string }) => Promise<SquarePaymentMethod>;
  googlePay: (opts: { countryCode: string; currencyCode: string; amount: string }) => Promise<SquarePaymentMethod>;
}

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments;
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
  const [purchase, setPurchase] = useState<{ amountCents: number; currency: string; viewerEmail?: string } | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<Array<{ id: string; cardBrand: string; last4: string; expMonth?: number; expYear?: number }>>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const applePayRef = useRef<HTMLDivElement>(null);
  const googlePayRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const cardInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const applePayInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const googlePayInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const squareInitRef = useRef(false);

  const squareApplicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const squareEnvironment = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  const squareSdkUrl =
    squareEnvironment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

  // Fetch purchase info and saved payment methods
  useEffect(() => {
    async function fetchPurchase() {
      try {
        const purchaseData = await apiClient.getPurchase(purchaseId);
        if (purchaseData) {
          setPurchase({
            amountCents: purchaseData.amountCents,
            currency: purchaseData.currency || 'USD',
            viewerEmail: purchaseData.viewerEmail,
          });

          // Fetch saved payment methods scoped to this purchase (owner context)
          if (purchaseId) {
            try {
              const savedMethods = await apiClient.getSavedPaymentMethods(purchaseId);
              if (savedMethods.paymentMethods && savedMethods.paymentMethods.length > 0) {
                // Additional frontend deduplication (backend already does this, but double-check)
                const uniqueMethods = savedMethods.paymentMethods.reduce((acc, method) => {
                  const key = `${method.cardBrand}-${method.last4}`;
                  if (!acc.find((m) => `${m.cardBrand}-${m.last4}` === key)) {
                    acc.push(method);
                  }
                  return acc;
                }, [] as typeof savedMethods.paymentMethods);
                
                setSavedPaymentMethods(uniqueMethods);
                // Auto-select first saved card for one-click payment
                if (uniqueMethods.length > 0) {
                  setSelectedSavedCard(uniqueMethods[0].id);
                }
              }
            } catch (err) {
              // Failed to fetch saved methods, continue without them
            }
          }
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load purchase details');
        setLoading(false);
      }
    }
    if (purchaseId) {
      void fetchPurchase();
    }
  }, [purchaseId]);

  // If Square config is missing, don't spin forever.
  useEffect(() => {
    if (!sdkLoaded) return;
    if (!purchase) return;
    if (!squareApplicationId || !squareLocationId) {
      setError('Square payment configuration is missing.');
      setLoading(false);
    }
  }, [sdkLoaded, purchase, squareApplicationId, squareLocationId]);

  useEffect(() => {
    if (sdkLoaded && squareApplicationId && squareLocationId && cardRef.current && purchase) {
      initializeSquare();
    }
  }, [sdkLoaded, squareApplicationId, squareLocationId, purchase]);

  useEffect(() => {
    return () => {
      // Cleanup on navigation/unmount to prevent duplicate iframes in dev/HMR.
      squareInitRef.current = false;
      cardInstanceRef.current?.destroy?.();
      applePayInstanceRef.current?.destroy?.();
      googlePayInstanceRef.current?.destroy?.();
      cardInstanceRef.current = null;
      applePayInstanceRef.current = null;
      googlePayInstanceRef.current = null;
      paymentsRef.current = null;
    };
  }, []);

  async function initializeSquare() {
    if (!window.Square || !cardRef.current || !purchase) return;
    if (squareInitRef.current) {
      setLoading(false);
      return;
    }
    squareInitRef.current = true;

    try {
      paymentsRef.current = window.Square.payments(squareApplicationId, squareLocationId);
      
      // Initialize card payment
      cardInstanceRef.current = await paymentsRef.current.card();
      await cardInstanceRef.current.attach(cardRef.current);

      // Initialize Apple Pay if available
      try {
        if (applePayRef.current) {
          applePayInstanceRef.current = await paymentsRef.current.applePay({
            countryCode: 'US',
            currencyCode: purchase.currency,
            amount: purchase.amountCents.toString(),
          });
          await applePayInstanceRef.current.attach(applePayRef.current);
        }
      } catch (err) {
        // Apple Pay not available (not Safari or not configured)
      }

      // Initialize Google Pay if available
      try {
        if (googlePayRef.current) {
          googlePayInstanceRef.current = await paymentsRef.current.googlePay({
            countryCode: 'US',
            currencyCode: purchase.currency,
            amount: purchase.amountCents.toString(),
          });
          await googlePayInstanceRef.current.attach(googlePayRef.current);
        }
      } catch (err) {
        // Google Pay not available
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load payment form. Please refresh the page.');
      setLoading(false);
    }
  }

  async function handleApplePay() {
    if (!applePayInstanceRef.current) {
      setError('Apple Pay not available');
      return;
    }

    try {
      const tokenResult = await applePayInstanceRef.current.tokenize();
      if (tokenResult.status === 'OK') {
        const data = await apiClient.processPurchasePayment(purchaseId, { sourceId: tokenResult.token });
        if (data.entitlementToken) {
          dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, { purchaseId, entitlementToken: data.entitlementToken });
          router.push(`/stream/${data.entitlementToken}`);
        } else {
          router.push(`/checkout/${purchaseId}/success`);
        }
      } else {
        setError(tokenResult.errors?.[0]?.message || 'Apple Pay failed');
      }
    } catch (err) {
      dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Apple Pay processing failed. Please try again.');
      }
    }
  }

  async function handleGooglePay() {
    if (!googlePayInstanceRef.current) {
      setError('Google Pay not available');
      return;
    }

    try {
      const tokenResult = await googlePayInstanceRef.current.tokenize();
      if (tokenResult.status === 'OK') {
        const data = await apiClient.processPurchasePayment(purchaseId, { sourceId: tokenResult.token });
        if (data.entitlementToken) {
          dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, { purchaseId, entitlementToken: data.entitlementToken });
          router.push(`/stream/${data.entitlementToken}`);
        } else {
          router.push(`/checkout/${purchaseId}/success`);
        }
      } else {
        setError(tokenResult.errors?.[0]?.message || 'Google Pay failed');
      }
    } catch (err) {
      dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Google Pay processing failed. Please try again.');
      }
    }
  }

  async function handlePayment() {
    if (processingPayment) return;

    // If using saved card, charge directly with card ID
    if (selectedSavedCard && savedPaymentMethods.length > 0) {
      await handleSavedCardPayment(selectedSavedCard);
      return;
    }

    // Otherwise, use card form
    if (!cardInstanceRef.current) {
      setError('Payment form not ready');
      return;
    }

    setProcessingPayment(true);
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
          router.push(`/stream/${data.entitlementToken}`);
        } else {
          router.push(`/checkout/${purchaseId}/success`);
        }
      } else {
        setError(tokenResult.errors?.[0]?.message || 'Payment failed');
        setProcessingPayment(false);
      }
    } catch (err) {
      dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Payment processing failed. Please try again.');
      }
      setProcessingPayment(false);
    }
  }

  async function handleSavedCardPayment(cardId: string) {
    if (processingPayment) return;
    setProcessingPayment(true);
    try {
      // Square allows using card ID directly as sourceId for saved cards
      const data = await apiClient.processPurchasePayment(purchaseId, { sourceId: cardId });
      
      // Redirect to watch page or success page
      if (data.entitlementToken) {
        dataEventBus.emit(DataEvents.PURCHASE_COMPLETED, {
          purchaseId,
          entitlementToken: data.entitlementToken,
        });
        router.push(`/stream/${data.entitlementToken}`);
      } else {
        router.push(`/checkout/${purchaseId}/success`);
      }
    } catch (err) {
      dataEventBus.emit(DataEvents.PURCHASE_FAILED, { purchaseId });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Payment processing failed. Please try again.');
      }
      setProcessingPayment(false);
    }
  }

  function formatCardBrand(brand: string): string {
    const brandMap: Record<string, string> = {
      VISA: 'Visa',
      MASTERCARD: 'Mastercard',
      AMERICAN_EXPRESS: 'Amex',
      DISCOVER: 'Discover',
      DISCOVER_DINERS: 'Diners',
      JCB: 'JCB',
      CHINA_UNIONPAY: 'UnionPay',
      SQUARE_GIFT_CARD: 'Gift Card',
      UNKNOWN: 'Card',
    };
    return brandMap[brand] || brand;
  }

  function formatExpiry(expMonth?: number, expYear?: number): string {
    if (!expMonth || !expYear) return '';
    return `${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`;
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
      <div className="min-h-screen py-6 sm:py-8 lg:py-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl">Complete Payment</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Secure payment powered by Square
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {squareApplicationId && squareLocationId ? (
              <div className="space-y-4" data-testid="container-payment">
                {loading && (
                  <div className="text-center py-8 space-y-4" data-testid="loading-payment">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm sm:text-base text-muted-foreground">Loading payment form...</p>
                  </div>
                )}

                {/* Saved Payment Methods - One-Click Payment */}
                {!loading && savedPaymentMethods.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Saved Payment Methods</h3>
                    <div className="space-y-2">
                      {savedPaymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedSavedCard(method.id)}
                          data-testid={`saved-card-${method.id}`}
                          className={`w-full text-left p-3 rounded-md border-2 transition-colors ${
                            selectedSavedCard === method.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{formatCardBrand(method.cardBrand)}</span>
                              <span className="text-sm text-muted-foreground">•••• {method.last4}</span>
                              {method.expMonth && method.expYear && (
                                <span className="text-xs text-muted-foreground">
                                  Expires {formatExpiry(method.expMonth, method.expYear)}
                                </span>
                              )}
                            </div>
                            {selectedSavedCard === method.id && (
                              <span className="text-xs text-primary">✓ Selected</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {selectedSavedCard && (
                      <Button
                        onClick={() => handleSavedCardPayment(selectedSavedCard)}
                        className="w-full"
                        data-testid="pay-with-saved-card"
                        size="lg"
                        disabled={processingPayment}
                      >
                        {processingPayment
                          ? 'Processing...'
                          : purchase
                            ? `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: purchase.currency }).format(purchase.amountCents / 100)}`
                            : 'Pay Now'}
                      </Button>
                    )}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or use a new card</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Apple Pay Button - Most prominent for iOS users */}
                <div
                  ref={applePayRef}
                  data-testid="apple-pay-container"
                  className={loading ? 'hidden' : 'w-full'}
                />

                {/* Google Pay Button */}
                <div
                  ref={googlePayRef}
                  data-testid="google-pay-container"
                  className={loading ? 'hidden' : 'w-full'}
                />

                {/* Divider */}
                {!loading && (applePayInstanceRef.current || googlePayInstanceRef.current) && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or pay with card</span>
                    </div>
                  </div>
                )}

                {/* Card Payment - Only show if no saved card selected or user wants new card */}
                {(!selectedSavedCard || savedPaymentMethods.length === 0) && (
                  <>
                    <div
                      id="card-container"
                      ref={cardRef}
                      data-testid="square-card-container"
                      className={loading ? 'opacity-0 pointer-events-none h-0' : ''}
                    />
                    {!loading && (
                      <Button
                        onClick={handlePayment}
                        className="w-full"
                        data-testid="pay-now"
                        size="lg"
                        disabled={processingPayment}
                      >
                        {processingPayment
                          ? 'Processing...'
                          : purchase
                            ? `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: purchase.currency }).format(purchase.amountCents / 100)}`
                            : 'Pay Now'}
                      </Button>
                    )}
                  </>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  Secure payment powered by Square
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground space-y-2 py-4">
                <p className="text-sm sm:text-base">Square payment configuration is missing.</p>
                <p className="text-xs sm:text-sm">Please configure NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
