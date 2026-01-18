'use client';

import { useState } from 'react';
import { BottomSheet } from './primitives/BottomSheet';
import { TouchButton } from './primitives/TouchButton';
import { Input } from './primitives/Input';
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

  if (isSuccess) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        snapPoints={[0.5]}
        enableDrag={true}
        aria-labelledby="coming-soon-success-title"
      >
        <div
          className="space-y-6 pb-6 text-center"
          data-testid="modal-coming-soon-success"
        >
          <div className="text-6xl">🎉</div>
          <h2
            id="coming-soon-success-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            You're on the List!
          </h2>
          <p className="text-[var(--fv-color-text-secondary)]">
            We'll notify you as soon as we launch on <strong>February 15, 2026</strong>.
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
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      snapPoints={[0.85]}
      enableDrag={true}
      aria-labelledby="coming-soon-modal-title"
    >
      <div
        className="space-y-6 pb-6"
        data-testid="modal-coming-soon"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🚀</div>
          <h2
            id="coming-soon-modal-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            Coming Soon!
          </h2>
          {isVeoReferral && (
            <p className="text-[var(--fv-color-text-secondary)]">
              Thanks for finding us through your Veo camera! 👋
            </p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-4">
          <p className="text-[var(--fv-color-text-primary)]">
            Thanks for visiting FieldView.Live!
          </p>
          <p className="text-[var(--fv-color-text-secondary)]">
            We're building something special for Veo camera owners – a platform to 
            monetize your live streams with built-in paywalls and instant payments.
          </p>
        </div>

        {/* Launch Date */}
        <div className="bg-[var(--fv-color-bg-secondary)] rounded-xl p-4 text-center">
          <div className="text-sm text-[var(--fv-color-text-muted)] mb-1">
            🗓️ Launch Date
          </div>
          <div className="text-2xl font-bold text-[var(--fv-color-accent)]">
            February 15, 2026
          </div>
        </div>

        {/* Email Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--fv-color-text-primary)] mb-3">
              Want to be notified when we go live?
            </p>
            
            <div className="space-y-3">
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
              <p className="text-sm text-red-500 mt-2" data-testid="error-message">
                {error}
              </p>
            )}
          </div>

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
        </form>

        {/* Maybe Later Button */}
        <TouchButton
          variant="ghost"
          size="md"
          fullWidth
          onClick={handleClose}
          data-testid="btn-maybe-later"
        >
          Maybe Later
        </TouchButton>

        {/* Don't show again checkbox */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--fv-color-border)]"
            data-testid="checkbox-dont-show"
          />
          <label
            htmlFor="dont-show-again"
            className="text-sm text-[var(--fv-color-text-muted)]"
          >
            Don&apos;t show this again
          </label>
        </div>
      </div>
    </BottomSheet>
  );
}
