'use client';

/**
 * SquareWalletPayment
 *
 * Inline Square Web Payments SDK checkout: Apple Pay + Google Pay one-tap, with a
 * card field fallback. Tokenizes in the browser and charges via the existing
 * `/purchases/:id/process` endpoint (marketplace Model A — charges the owner's
 * connected Square account and creates the entitlement synchronously).
 *
 * Implemented per the Square Web Payments SDK reference: digital wallets require a
 * `paymentRequest` with the total in DOLLARS (string); Apple Pay uses a custom
 * button + immediate tokenize() inside the click handler (no .attach()); Google
 * Pay renders via .attach().
 *   https://developer.squareup.com/docs/web-payments/apple-pay
 *   https://developer.squareup.com/docs/web-payments/google-pay
 */

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';

interface SquareTokenizeResult {
  status: string; // 'OK' on success
  token?: string;
  errors?: Array<{ message?: string }>;
}

interface SquarePaymentMethod {
  attach: (el: HTMLElement | string) => Promise<void>;
  tokenize: () => Promise<SquareTokenizeResult>;
  destroy?: () => void;
}

interface SquarePaymentRequest {
  __brand?: 'square-payment-request';
}

interface SquarePayments {
  card: () => Promise<SquarePaymentMethod>;
  paymentRequest: (opts: {
    countryCode: string;
    currencyCode: string;
    total: { amount: string; label: string };
  }) => SquarePaymentRequest;
  applePay: (pr: SquarePaymentRequest) => Promise<SquarePaymentMethod>;
  googlePay: (pr: SquarePaymentRequest) => Promise<SquarePaymentMethod>;
}

interface SquareSdk {
  payments: (applicationId: string, locationId: string) => SquarePayments;
}

// Access window.Square via a local cast rather than a global `declare`, so this
// file's richer SquarePayments type (incl. paymentRequest) does not collide with
// the leaner global Window.Square declared by the standalone /checkout page.
function getSquareSdk(): SquareSdk | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Square?: SquareSdk }).Square;
}

export interface SquareWalletPaymentProps {
  /** A purchase already created server-side in `created` status (carries amount, owner, directStreamId). */
  purchaseId: string;
  amountCents: number;
  currency?: string;
  /** Called after the server confirms the charge and the entitlement exists. */
  onSuccess: () => void;
  /** Surface a human-readable error to the parent (e.g. the paywall modal). */
  onError?: (message: string) => void;
}

export function SquareWalletPayment({
  purchaseId,
  amountCents,
  currency = 'USD',
  onSuccess,
  onError,
}: SquareWalletPaymentProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [canApplePay, setCanApplePay] = useState(false);
  const [canGooglePay, setCanGooglePay] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const googlePayRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const cardInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const applePayInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const googlePayInstanceRef = useRef<SquarePaymentMethod | null>(null);
  const initRef = useRef(false);
  const processingRef = useRef(false);

  // TEMP diagnostic: surface why a wallet button failed to initialize.
  const [diag, setDiag] = useState<string[]>([]);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const env = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  const sdkUrl =
    env === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
  const amountDisplay = (amountCents / 100).toFixed(2);

  // If the SDK script was already loaded by a prior mount, don't wait for onLoad.
  useEffect(() => {
    if (getSquareSdk()) setSdkLoaded(true);
  }, []);

  useEffect(() => {
    if (!sdkLoaded || initRef.current) return;
    if (!appId || !locationId) {
      onError?.('Payment is not configured for this stream yet. Please try again later.');
      return;
    }
    const sdk = getSquareSdk();
    if (!sdk || !cardRef.current) return;
    initRef.current = true;

    void (async () => {
      try {
        const payments = sdk.payments(appId, locationId);
        paymentsRef.current = payments;

        // Card (always available as a fallback)
        const card = await payments.card();
        await card.attach(cardRef.current!);
        cardInstanceRef.current = card;

        // Digital wallets each need their own paymentRequest with the total in dollars.
        const buildPaymentRequest = () =>
          payments.paymentRequest({
            countryCode: 'US',
            currencyCode: currency,
            total: { amount: amountDisplay, label: 'Stream access' },
          });

        // Apple Pay — Safari/iOS only; no .attach(), we render our own button.
        try {
          const applePay = await payments.applePay(buildPaymentRequest());
          applePayInstanceRef.current = applePay;
          setCanApplePay(true);
          setDiag((d) => [...d, 'Apple Pay: available ✓']);
        } catch (e) {
          setDiag((d) => [...d, 'Apple Pay: ' + ((e as { message?: string; name?: string })?.message || (e as { name?: string })?.name || 'unavailable on this device')]);
        }

        // Google Pay — renders its branded button into the container via .attach().
        try {
          const googlePay = await payments.googlePay(buildPaymentRequest());
          if (googlePayRef.current) {
            await googlePay.attach(googlePayRef.current);
            googlePayInstanceRef.current = googlePay;
            setCanGooglePay(true);
          }
          setDiag((d) => [...d, 'Google Pay: available ✓']);
        } catch (e) {
          setDiag((d) => [...d, 'Google Pay: ' + ((e as { message?: string; name?: string })?.message || (e as { name?: string })?.name || 'unavailable on this device')]);
        }

        setReady(true);
      } catch {
        onError?.('Failed to load the payment form. Please refresh and try again.');
      }
    })();
    // amountDisplay/currency are derived from props; re-init not expected mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkLoaded, appId, locationId]);

  // Cleanup Square iframes/instances on unmount.
  useEffect(() => {
    return () => {
      initRef.current = false;
      cardInstanceRef.current?.destroy?.();
      applePayInstanceRef.current?.destroy?.();
      googlePayInstanceRef.current?.destroy?.();
      cardInstanceRef.current = null;
      applePayInstanceRef.current = null;
      googlePayInstanceRef.current = null;
      paymentsRef.current = null;
    };
  }, []);

  async function chargeWithToken(tokenResult: SquareTokenizeResult) {
    if (tokenResult.status !== 'OK' || !tokenResult.token) {
      onError?.(tokenResult.errors?.[0]?.message || 'Payment was canceled.');
      return;
    }
    setProcessing(true);
    processingRef.current = true;
    try {
      const result = await apiClient.processPurchasePayment(purchaseId, { sourceId: tokenResult.token });
      if (result.status === 'paid' || result.entitlementToken) {
        onSuccess();
      } else {
        onError?.('Payment did not complete. Please try a different method.');
      }
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }

  // tokenize() must be the first call inside the user-gesture handler (esp. Apple Pay).
  async function handleApplePay() {
    if (processingRef.current || !applePayInstanceRef.current) return;
    try {
      const tokenResult = await applePayInstanceRef.current.tokenize();
      await chargeWithToken(tokenResult);
    } catch {
      onError?.('Apple Pay was canceled or unavailable.');
    }
  }

  async function handleGooglePay() {
    if (processingRef.current || !googlePayInstanceRef.current) return;
    try {
      const tokenResult = await googlePayInstanceRef.current.tokenize();
      await chargeWithToken(tokenResult);
    } catch {
      onError?.('Google Pay was canceled or unavailable.');
    }
  }

  async function handleCard() {
    if (processingRef.current || !cardInstanceRef.current) return;
    try {
      const tokenResult = await cardInstanceRef.current.tokenize();
      await chargeWithToken(tokenResult);
    } catch {
      onError?.('Card payment failed. Please check your details and try again.');
    }
  }

  return (
    <div className="space-y-3" data-testid="square-wallet-payment">
      <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} onReady={() => setSdkLoaded(true)} />

      {/* TEMP diagnostic — shows exactly why each wallet did/didn't initialize. */}
      {diag.length > 0 && (
        <div data-testid="wallet-diag" className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {diag.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* One-tap wallets */}
      {(canApplePay || canGooglePay) && (
        <div className="space-y-2">
          {canApplePay && (
            <button
              type="button"
              data-testid="btn-apple-pay"
              onClick={handleApplePay}
              disabled={processing}
              aria-label="Pay with Apple Pay"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span aria-hidden></span>
              <span>Pay</span>
            </button>
          )}
          {canGooglePay && (
            <div
              ref={googlePayRef}
              data-testid="btn-google-pay"
              onClick={handleGooglePay}
              className="min-h-[48px] w-full overflow-hidden rounded-lg [&>*]:w-full"
            />
          )}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-outline" />
            <span className="text-xs text-muted">or pay with card</span>
            <span className="h-px flex-1 bg-outline" />
          </div>
        </div>
      )}

      {/* Card field (Square-hosted iframe) */}
      <div ref={cardRef} data-testid="square-card-container" className="min-h-[44px]" />

      <Button
        type="button"
        data-testid="btn-pay-card"
        onClick={handleCard}
        disabled={processing || !ready}
        className="w-full"
        size="lg"
        data-loading={processing}
      >
        {processing ? 'Processing…' : `Pay $${amountDisplay}`}
      </Button>

      <p className="text-center text-xs text-muted">Secured by Square. We never store your card details.</p>
    </div>
  );
}
