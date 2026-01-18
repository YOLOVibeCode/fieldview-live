'use client';

import { useState } from 'react';
import { TouchButton } from './primitives/TouchButton';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api-client';

export interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
  isVeoReferral?: boolean;
}

export function ComingSoonModal({
  isOpen,
  onClose,
  onDontShowAgain,
  isVeoReferral = false,
}: ComingSoonModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dontShow, setDontShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiRequest('/early-access/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: isVeoReferral ? 'veo' : 'organic',
        }),
      });

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (dontShow) {
      onDontShowAgain();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with Gaussian Blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[var(--fv-z-modal)] animate-fade-in"
        onClick={handleClose}
        data-testid="modal-backdrop"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[calc(var(--fv-z-modal)+1)] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--fv-color-bg-primary)] rounded-[var(--fv-radius-xl)] shadow-[var(--fv-elevation-5)] w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          data-testid={isSuccess ? "modal-coming-soon-success" : "modal-coming-soon"}
        >
          {isSuccess ? (
            // Success State
            <div className="p-6 sm:p-8 text-center space-y-6">
              <div className="text-6xl animate-bounce-subtle">🎉</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--fv-color-text-primary)]">
                You're on the List!
              </h2>
              <p className="text-[var(--fv-color-text-secondary)]">
                We'll notify you as soon as we launch on{' '}
                <strong className="text-[var(--fv-color-accent)]">February 15, 2026</strong>.
              </p>
              <p className="text-sm text-[var(--fv-color-text-muted)]">
                Check your inbox for a confirmation email.
              </p>
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleClose}
                data-testid="btn-close-success"
              >
                Got It!
              </TouchButton>
            </div>
          ) : (
            // Main Form
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="text-5xl sm:text-6xl">🚀</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--fv-color-text-primary)]">
                  Coming Soon!
                </h2>
                {isVeoReferral && (
                  <p className="text-sm text-[var(--fv-color-text-secondary)]">
                    Thanks for finding us through your Veo camera! 👋
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-3 text-center">
                <p className="text-[var(--fv-color-text-secondary)]">
                  We're building something special for Veo camera owners – monetize your live streams with built-in paywalls and instant payments.
                </p>
              </div>

              {/* Launch Date */}
              <div className="bg-[var(--fv-color-bg-secondary)] rounded-[var(--fv-radius-lg)] p-4 text-center">
                <div className="text-xs text-[var(--fv-color-text-muted)] mb-1">
                  🗓️ LAUNCH DATE
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--fv-color-accent)]">
                  February 15, 2026
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--fv-color-text-primary)] text-center">
                    Get notified when we launch:
                  </p>
                  
                  <Input
                    type="text"
                    placeholder="Your Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-name"
                  />
                  
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center" data-testid="error-message">
                    {error}
                  </p>
                )}

                <TouchButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting || !email}
                  data-testid="btn-notify-me"
                >
                  {isSubmitting ? 'Signing Up...' : 'Notify Me'}
                </TouchButton>

                <TouchButton
                  type="button"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={handleClose}
                  data-testid="btn-maybe-later"
                >
                  Maybe Later
                </TouchButton>
              </form>

              {/* Don't show again */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-[var(--fv-color-border)]">
                <input
                  type="checkbox"
                  id="dont-show-again"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--fv-color-border)] text-[var(--fv-color-primary-500)] focus:ring-2 focus:ring-[var(--fv-color-primary-500)]"
                  data-testid="checkbox-dont-show"
                />
                <label
                  htmlFor="dont-show-again"
                  className="text-sm text-[var(--fv-color-text-muted)] cursor-pointer"
                >
                  Don&apos;t show this again
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
