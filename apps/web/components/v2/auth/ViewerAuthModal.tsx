/**
 * ViewerAuthModal Component
 * 
 * Email-based authentication modal for viewers (adapted from v2 AuthModal).
 * Simplified for viewer unlock flow - just email, no password.
 * 
 * Usage:
 * ```tsx
 * <ViewerAuthModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onRegister={(email, name) => handleRegister(email, name)}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';

export interface ViewerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (email: string, name: string) => void;
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

/**
 * ViewerAuthModal Component
 * 
 * Bottom sheet with email-based viewer registration
 */
export function ViewerAuthModal({
  isOpen,
  onClose,
  onRegister,
  isLoading = false,
  error = null,
  title = 'Join the Chat',
  description = 'Register your email to start chatting',
}: ViewerAuthModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isNameValid = validateName(name);
    
    if (isEmailValid && isNameValid) {
      onRegister(email.trim(), name.trim());
    }
  };

  const handleClose = () => {
    // Reset form on close
    setEmail('');
    setName('');
    setEmailError('');
    setNameError('');
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      snapPoints={[0.7]}
      initialSnap={0}
      enableDrag={true}
      enableBackdrop={true}
      aria-labelledby="viewer-auth-modal-title"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2
            id="viewer-auth-modal-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            {title}
          </h2>
          <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
            {description}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-viewer-register">
          {/* Name Input */}
          <div>
            <label
              htmlFor="viewer-name"
              className="block text-sm font-medium text-[var(--fv-color-text-primary)] mb-1"
            >
              Display Name
            </label>
            <input
              id="viewer-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(name)}
              disabled={isLoading}
              placeholder="Your name"
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-[var(--fv-color-bg-secondary)]',
                'border-2',
                nameError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--fv-color-border)] focus:border-[var(--fv-color-primary)]',
                'text-[var(--fv-color-text-primary)]',
                'placeholder:text-[var(--fv-color-text-tertiary)]',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary)]/20'
              )}
              data-testid="input-name"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
            {nameError && (
              <p
                id="name-error"
                role="alert"
                className="text-sm text-red-500 mt-1"
                data-testid="error-name"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label
              htmlFor="viewer-email"
              className="block text-sm font-medium text-[var(--fv-color-text-primary)] mb-1"
            >
              Email Address
            </label>
            <input
              id="viewer-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              disabled={isLoading}
              placeholder="you@example.com"
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-[var(--fv-color-bg-secondary)]',
                'border-2',
                emailError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--fv-color-border)] focus:border-[var(--fv-color-primary)]',
                'text-[var(--fv-color-text-primary)]',
                'placeholder:text-[var(--fv-color-text-tertiary)]',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary)]/20'
              )}
              data-testid="input-email"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p
                id="email-error"
                role="alert"
                className="text-sm text-red-500 mt-1"
                data-testid="error-email"
              >
                {emailError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <TouchButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
            data-testid="btn-submit-viewer-register"
            aria-label="Register to chat"
          >
            {isLoading ? 'Registering...' : 'Register to Chat'}
          </TouchButton>
        </form>

        {/* Privacy Note */}
        <p className="text-xs text-[var(--fv-color-text-tertiary)] text-center">
          We'll send you a secure link to verify your email.
          <br />
          No password required!
        </p>
      </div>
    </BottomSheet>
  );
}

