/**
 * V2 PaywallModal Component
 * 
 * Mobile-first paywall modal using v2 design system.
 * Converted from v1 PaywallModal with BottomSheet, TouchButton, and design tokens.
 * 
 * Features:
 * - Bottom sheet for mobile-friendly UX
 * - v2 design tokens throughout
 * - Demo bypass mechanism
 * - Saved payment method detection
 * - Full automation support (data-testid, ARIA)
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';
import { cn } from '@/lib/utils';

export interface PaywallModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceInCents: number;
  paywallMessage?: string | null;
  allowSavePayment?: boolean;
  
  // Demo mode props
  demoMode?: boolean;
  onDemoBypass?: () => void;
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
  demoMode = false,
  onDemoBypass,
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
      const response = await fetch(`${apiUrl}/api/direct/${slug}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { purchaseId, checkoutUrl } = await response.json();

      // Redirect to Square checkout page
      window.location.href = checkoutUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    if (demoMode && onDemoBypass) {
      onDemoBypass();
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.9]}
      initialSnap={0}
      enableDrag={true}
      enableBackdrop={true}
      aria-labelledby="paywall-modal-title"
    >
      <div className="space-y-6" data-testid="paywall-modal-v2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--fv-color-primary)]/10">
              <Lock className="h-6 w-6 text-[var(--fv-color-primary)]" />
            </div>
            <div>
              <h2
                id="paywall-modal-title"
                className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
              >
                Access Required
              </h2>
              <p className="text-sm text-[var(--fv-color-text-secondary)]">
                One-time payment: <strong className="text-[var(--fv-color-primary)]">${priceDisplay}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Admin Custom Message */}
        {paywallMessage && (
          <div
            data-testid="paywall-custom-message"
            className="p-4 bg-[var(--fv-color-primary)]/10 border-2 border-[var(--fv-color-primary)]/20 rounded-xl"
            role="note"
          >
            <p className="text-sm text-[var(--fv-color-text-primary)] whitespace-pre-wrap">
              {paywallMessage}
            </p>
          </div>
        )}

        {/* Demo Mode Badge */}
        {demoMode && (
          <div
            data-testid="demo-mode-badge"
            className="flex items-center gap-2 p-3 bg-amber-500/10 border-2 border-amber-500/20 rounded-xl"
          >
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-500">
                Demo Mode Active
              </p>
              <p className="text-xs text-[var(--fv-color-text-secondary)]">
                This is a demonstration paywall
              </p>
            </div>
            <TouchButton
              variant="secondary"
              size="sm"
              onClick={handleDemoBypass}
              data-testid="btn-demo-bypass"
            >
              Bypass
            </TouchButton>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            data-testid="error-paywall"
            className="flex items-center gap-3 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-xl"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Step 1: User Info */}
        {step === 'info' && (
          <form onSubmit={handleInfoSubmit} className="space-y-4" data-testid="form-paywall-info">
            <div>
              <label
                htmlFor="paywall-email"
                className="block text-sm font-medium text-[var(--fv-color-text-primary)] mb-2"
              >
                Email Address
              </label>
              <input
                id="paywall-email"
                data-testid="input-paywall-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={cn(
                  'w-full px-4 py-3 rounded-xl',
                  'bg-[var(--fv-color-bg-secondary)]',
                  'border-2 border-[var(--fv-color-border)]',
                  'text-[var(--fv-color-text-primary)]',
                  'placeholder:text-[var(--fv-color-text-tertiary)]',
                  'focus:border-[var(--fv-color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary)]/20',
                  'transition-all duration-200'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="paywall-first-name"
                  className="block text-sm font-medium text-[var(--fv-color-text-primary)] mb-2"
                >
                  First Name
                </label>
                <input
                  id="paywall-first-name"
                  data-testid="input-paywall-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  autoComplete="given-name"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-[var(--fv-color-bg-secondary)]',
                    'border-2 border-[var(--fv-color-border)]',
                    'text-[var(--fv-color-text-primary)]',
                    'placeholder:text-[var(--fv-color-text-tertiary)]',
                    'focus:border-[var(--fv-color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary)]/20',
                    'transition-all duration-200'
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="paywall-last-name"
                  className="block text-sm font-medium text-[var(--fv-color-text-primary)] mb-2"
                >
                  Last Name
                </label>
                <input
                  id="paywall-last-name"
                  data-testid="input-paywall-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  autoComplete="family-name"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-[var(--fv-color-bg-secondary)]',
                    'border-2 border-[var(--fv-color-border)]',
                    'text-[var(--fv-color-text-primary)]',
                    'placeholder:text-[var(--fv-color-text-tertiary)]',
                    'focus:border-[var(--fv-color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary)]/20',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* Saved Card Detection */}
            {savedPayment?.hasSavedCard && (
              <div
                data-testid="saved-card-detected"
                className="flex items-center gap-3 p-4 bg-green-500/10 border-2 border-green-500/20 rounded-xl"
              >
                <CreditCard className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-500">Saved Payment Found</p>
                  <p className="text-xs text-[var(--fv-color-text-secondary)]">
                    {savedPayment.cardBrand} •••• {savedPayment.cardLastFour}
                  </p>
                </div>
              </div>
            )}

            <TouchButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              data-testid="btn-continue-to-payment"
            >
              Continue to Payment
            </TouchButton>
          </form>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && (
          <form onSubmit={handlePayment} className="space-y-4" data-testid="form-paywall-payment">
            <div className="p-4 bg-[var(--fv-color-bg-secondary)] rounded-xl">
              <p className="text-sm text-[var(--fv-color-text-secondary)] mb-1">
                <strong className="text-[var(--fv-color-text-primary)]">Email:</strong> {email}
              </p>
              <p className="text-sm text-[var(--fv-color-text-secondary)]">
                <strong className="text-[var(--fv-color-text-primary)]">Name:</strong> {firstName} {lastName}
              </p>
              <TouchButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('info')}
                className="mt-2"
                data-testid="btn-back-to-info"
              >
                ← Edit Information
              </TouchButton>
            </div>

            {/* Payment Method Selection */}
            {savedPayment?.hasSavedCard && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--fv-color-text-primary)]">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <label
                    data-testid="radio-saved-card-label"
                    className={cn(
                      'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                      usesSavedCard
                        ? 'border-[var(--fv-color-primary)] bg-[var(--fv-color-primary)]/5'
                        : 'border-[var(--fv-color-border)] hover:border-[var(--fv-color-primary)]/50'
                    )}
                  >
                    <input
                      data-testid="radio-saved-card"
                      type="radio"
                      name="payment-method"
                      checked={usesSavedCard}
                      onChange={() => setUsesSavedCard(true)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--fv-color-text-primary)]">Use Saved Card</div>
                      <div className="text-sm text-[var(--fv-color-text-secondary)]">
                        {savedPayment.cardBrand} •••• {savedPayment.cardLastFour}
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 text-[var(--fv-color-text-tertiary)]" />
                  </label>

                  <label
                    data-testid="radio-new-card-label"
                    className={cn(
                      'flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                      !usesSavedCard
                        ? 'border-[var(--fv-color-primary)] bg-[var(--fv-color-primary)]/5'
                        : 'border-[var(--fv-color-border)] hover:border-[var(--fv-color-primary)]/50'
                    )}
                  >
                    <input
                      data-testid="radio-new-card"
                      type="radio"
                      name="payment-method"
                      checked={!usesSavedCard}
                      onChange={() => setUsesSavedCard(false)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--fv-color-text-primary)]">Use Different Card</div>
                      <div className="text-sm text-[var(--fv-color-text-secondary)]">Enter new payment details</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Square Card Input Placeholder */}
            {!usesSavedCard && (
              <div
                data-testid="square-card-input"
                className="p-8 border-2 border-dashed border-[var(--fv-color-border)] rounded-xl bg-[var(--fv-color-bg-secondary)]/50"
              >
                <p className="text-sm text-[var(--fv-color-text-secondary)] text-center">
                  Square Payment Form will appear here
                </p>
                <p className="text-xs text-[var(--fv-color-text-tertiary)] text-center mt-2">
                  (Redirects to Square checkout)
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
                  className="mt-1 w-5 h-5"
                />
                <div className="text-sm">
                  <div className="font-medium text-[var(--fv-color-text-primary)]">
                    Save payment information
                  </div>
                  <div className="text-[var(--fv-color-text-secondary)]">
                    Securely save this card for future purchases
                  </div>
                </div>
              </label>
            )}

            <div className="pt-4 border-t-2 border-[var(--fv-color-border)]">
              <TouchButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={loading}
                data-loading={loading}
                data-testid="btn-complete-payment"
              >
                {loading ? 'Processing...' : `Pay $${priceDisplay}`}
              </TouchButton>
            </div>
          </form>
        )}

        {/* Privacy Note */}
        <p className="text-xs text-center text-[var(--fv-color-text-tertiary)]">
          🔒 Secure payment powered by Square
          <br />
          Your payment information is encrypted and secure
        </p>
      </div>
    </BottomSheet>
  );
}

