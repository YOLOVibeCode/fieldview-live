'use client';

/**
 * Enhanced Paywall Modal
 * 
 * Features:
 * - Admin custom message display
 * - Saved payment method detection
 * - Radio buttons for payment selection
 * - Square Web SDK integration
 * - Option to save payment method
 * - Full automation-friendly (data-testid, ARIA labels)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CreditCard, Lock } from 'lucide-react';

interface PaywallModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  allowSavePayment = false,
}: PaywallModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savedPayment, setSavedPayment] = useState<SavedPaymentMethod | null>(null);
  const [usesSavedCard, setUsesSavedCard] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'payment'>('info');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
  const priceDisplay = (priceInCents / 100).toFixed(2);

  // Check for saved payment when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      checkSavedPayment();
    } else {
      setSavedPayment(null);
      setUsesSavedCard(false);
    }
  }, [email]);

  const checkSavedPayment = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/direct/${slug}/payment-methods?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) return;

      const data: SavedPaymentMethod = await response.json();
      setSavedPayment(data);
      
      // Auto-select saved card if available
      if (data.hasSavedCard) {
        setUsesSavedCard(true);
      }
    } catch (err) {
      // Silently fail - not critical
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !firstName || !lastName) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setStep('payment');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Integrate with Square Web SDK for actual payment
      // For now, simulate payment success
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // If saving payment method, call the API
      if (savePaymentMethod && allowSavePayment) {
        await fetch(`${apiUrl}/api/direct/${slug}/save-payment-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            squareCustomerId: 'sq-cust-mock-123',
            squareCardId: 'sq-card-mock-456',
            cardLastFour: '1234',
            cardBrand: 'Visa',
          }),
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
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
          {/* Admin Custom Message */}
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
            <div
              data-testid="error-paywall"
              className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg"
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: User Info */}
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

              {/* Saved Card Detection */}
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
              >
                Continue to Payment
              </Button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === 'payment' && (
            <form data-testid="form-paywall-payment" onSubmit={handlePayment} className="space-y-4">
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
                  onClick={() => setStep('info')}
                  className="p-0 h-auto"
                >
                  Edit
                </Button>
              </div>

              {/* Payment Method Selection */}
              {savedPayment?.hasSavedCard && (
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="space-y-2">
                    <label
                      data-testid="radio-saved-card-label"
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        usesSavedCard
                          ? 'border-primary bg-primary/5'
                          : 'border-outline hover:border-primary/50'
                      }`}
                    >
                      <input
                        data-testid="radio-saved-card"
                        type="radio"
                        name="payment-method"
                        checked={usesSavedCard}
                        onChange={() => setUsesSavedCard(true)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Use Saved Card</div>
                        <div className="text-sm text-muted">
                          {savedPayment.cardBrand} •••• {savedPayment.cardLastFour}
                        </div>
                      </div>
                      <CreditCard className="h-5 w-5 text-muted" />
                    </label>

                    <label
                      data-testid="radio-new-card-label"
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        !usesSavedCard
                          ? 'border-primary bg-primary/5'
                          : 'border-outline hover:border-primary/50'
                      }`}
                    >
                      <input
                        data-testid="radio-new-card"
                        type="radio"
                        name="payment-method"
                        checked={!usesSavedCard}
                        onChange={() => setUsesSavedCard(false)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">Use Different Card</div>
                        <div className="text-sm text-muted">Enter new payment details</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Square Card Input (Mock) */}
              {!usesSavedCard && (
                <div
                  data-testid="square-card-input"
                  className="p-6 border-2 border-dashed border-outline rounded-lg bg-background/50"
                >
                  <p className="text-sm text-muted text-center">
                    Square Payment Form will appear here
                  </p>
                  <p className="text-xs text-muted text-center mt-2">
                    (Integration pending)
                  </p>
                </div>
              )}

              {/* Save Payment Option */}
              {allowSavePayment && !usesSavedCard && (
                <label
                  data-testid="checkbox-save-payment-label"
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    data-testid="checkbox-save-payment"
                    type="checkbox"
                    checked={savePaymentMethod}
                    onChange={(e) => setSavePaymentMethod(e.target.checked)}
                    className="mt-1 w-4 h-4"
                  />
                  <div className="text-sm">
                    <div className="font-medium">Save payment information</div>
                    <div className="text-muted">
                      Securely save this card for future purchases on this site
                    </div>
                  </div>
                </label>
              )}

              <div className="pt-4 border-t border-outline">
                <Button
                  data-testid="btn-complete-payment"
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                  data-loading={loading}
                >
                  {loading ? 'Processing...' : `Pay $${priceDisplay}`}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

