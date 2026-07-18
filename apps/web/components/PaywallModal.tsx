'use client';

/**
 * Paywall Modal
 *
 * Two steps, no page navigation:
 *  1. Collect viewer email + name (required for receipt / viewer identity).
 *  2. Inline one-tap checkout — Apple Pay / Google Pay / card via the Square Web
 *     Payments SDK (<SquareWalletPayment>). On success the stream unlocks in place
 *     (the parent's onSuccess marks paid + fetches the entitled stream URL).
 *
 * Replaces the previous mock card form + redirect to /checkout/{id} (a route that
 * does not exist) with a working, frictionless inline charge.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Lock } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { getUserFriendlyMessage } from '@/lib/error-messages';
import { ErrorBanner } from '@/components/v2/ErrorBanner';
import { SquareWalletPayment } from '@/components/checkout/SquareWalletPayment';

interface PaywallModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a confirmed charge. Receives the email used to pay so the parent
   *  can resolve the (anonymous) viewer's entitlement and unlock the stream in place. */
  onSuccess: (email?: string) => void;
  priceInCents: number;
  paywallMessage?: string | null;
  allowSavePayment?: boolean;
}

interface SavedPaymentMethod {
  hasSavedCard: boolean;
  cardLastFour?: string;
  cardBrand?: string;
  squareCustomerId?: string;
}

export function PaywallModal({
  slug,
  isOpen,
  onClose,
  onSuccess,
  priceInCents,
  paywallMessage,
}: PaywallModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savedPayment, setSavedPayment] = useState<SavedPaymentMethod | null>(null);
  const [creatingPurchase, setCreatingPurchase] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'payment'>('info');

  const priceDisplay = (priceInCents / 100).toFixed(2);

  // Check for a saved card when the email looks valid (informational badge only).
  useEffect(() => {
    if (email && email.includes('@')) {
      void checkSavedPayment();
    } else {
      setSavedPayment(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const checkSavedPayment = async () => {
    try {
      const data = await apiRequest<SavedPaymentMethod>(
        `/api/direct/${slug}/payment-methods?email=${encodeURIComponent(email)}`,
        { retries: 1 }
      );
      setSavedPayment(data);
    } catch {
      // Not critical — ignore.
    }
  };

  // Step 1 -> create the purchase server-side, then advance to inline payment.
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setCreatingPurchase(true);
    try {
      const { purchaseId: createdId } = await apiRequest<{ purchaseId: string }>(
        `/api/direct/${slug}/checkout`,
        { method: 'POST', body: JSON.stringify({ email, firstName, lastName }) }
      );
      setPurchaseId(createdId);
      setStep('payment');
    } catch (err) {
      setError(getUserFriendlyMessage(err));
    } finally {
      setCreatingPurchase(false);
    }
  };

  const handleEdit = () => {
    // Editing contact info invalidates the created purchase — start fresh.
    setPurchaseId(null);
    setStep('info');
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="paywall-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <Card className="w-full max-w-lg bg-elevated border-outline max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle id="paywall-title">Access Required</CardTitle>
            </div>
            <Button
              data-testid="btn-close-paywall"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close paywall"
            >
              ✕
            </Button>
          </div>
          <CardDescription>
            One-time payment to access this stream: <strong className="text-accent">${priceDisplay}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {paywallMessage && (
            <div
              data-testid="paywall-custom-message"
              className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm"
              role="note"
            >
              <p className="text-foreground whitespace-pre-wrap">{paywallMessage}</p>
            </div>
          )}

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} data-testid="error-paywall" />
          )}

          {/* Step 1: Viewer info */}
          {step === 'info' && (
            <form data-testid="form-paywall-info" onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paywall-email">Email Address</Label>
                <Input
                  id="paywall-email"
                  data-testid="input-paywall-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paywall-first-name">First Name</Label>
                  <Input
                    id="paywall-first-name"
                    data-testid="input-paywall-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    autoComplete="given-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paywall-last-name">Last Name</Label>
                  <Input
                    id="paywall-last-name"
                    data-testid="input-paywall-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {savedPayment?.hasSavedCard && (
                <div
                  data-testid="saved-card-detected"
                  className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 text-success font-semibold mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Saved Payment Found</span>
                  </div>
                  <p className="text-muted">
                    {savedPayment.cardBrand} ending in {savedPayment.cardLastFour}
                  </p>
                </div>
              )}

              <Button
                data-testid="btn-continue-to-payment"
                type="submit"
                className="w-full"
                size="lg"
                disabled={creatingPurchase}
                data-loading={creatingPurchase}
              >
                {creatingPurchase ? 'Preparing checkout…' : 'Continue to Payment'}
              </Button>
            </form>
          )}

          {/* Step 2: Inline one-tap payment */}
          {step === 'payment' && (
            <div data-testid="form-paywall-payment" className="space-y-4">
              <div className="text-sm text-muted">
                <p>
                  <strong>Email:</strong> {email}
                </p>
                <p>
                  <strong>Name:</strong> {firstName} {lastName}
                </p>
                <Button
                  data-testid="btn-back-to-info"
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleEdit}
                  className="p-0 h-auto"
                >
                  Edit
                </Button>
              </div>

              {purchaseId ? (
                <SquareWalletPayment
                  purchaseId={purchaseId}
                  amountCents={priceInCents}
                  onSuccess={() => onSuccess(email)}
                  onError={setError}
                />
              ) : (
                <p className="text-sm text-muted">Preparing secure checkout…</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
