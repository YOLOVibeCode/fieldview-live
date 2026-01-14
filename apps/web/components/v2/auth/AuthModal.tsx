/**
 * AuthModal Component
 * 
 * Unified authentication modal with login/register tabs
 * 
 * Usage:
 * ```tsx
 * <AuthModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   initialMode="login"
 *   onLogin={(data) => login(data)}
 *   onRegister={(data) => register(data)}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BottomSheet, TouchButton } from '@/components/v2/primitives';
import { LoginForm, type LoginFormData } from './LoginForm';
import { RegisterForm, type RegisterFormData } from './RegisterForm';

export type AuthMode = 'login' | 'register';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onLogin: (data: LoginFormData) => void;
  onRegister: (data: RegisterFormData) => void;
  isLoading?: boolean;
  error?: string | null;
  onForgotPassword?: () => void;
}

/**
 * AuthModal Component
 * 
 * Bottom sheet with tabbed login/register forms
 */
export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onLogin,
  onRegister,
  isLoading = false,
  error = null,
  onForgotPassword,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.9]}
      initialSnap={0}
      enableDrag={true}
      enableBackdrop={true}
      aria-labelledby="auth-modal-title"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2
            id="auth-modal-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-[var(--fv-color-text-secondary)] mt-1">
            {mode === 'login'
              ? 'Sign in to continue'
              : 'Join to start chatting and more'}
          </p>
        </div>
        
        {/* Tab Buttons */}
        <div
          role="tablist"
          className="flex gap-2 p-1 bg-[var(--fv-color-bg-elevated)] rounded-lg"
        >
          <button
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            disabled={isLoading}
            className={cn(
              'flex-1 h-10 rounded-md font-medium text-sm',
              'transition-colors duration-[var(--fv-duration-fast)]',
              mode === 'login'
                ? 'bg-[var(--fv-color-primary-500)] text-white'
                : 'text-[var(--fv-color-text-secondary)] hover:text-[var(--fv-color-text-primary)]',
              'disabled:opacity-50'
            )}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
            disabled={isLoading}
            className={cn(
              'flex-1 h-10 rounded-md font-medium text-sm',
              'transition-colors duration-[var(--fv-duration-fast)]',
              mode === 'register'
                ? 'bg-[var(--fv-color-primary-500)] text-white'
                : 'text-[var(--fv-color-text-secondary)] hover:text-[var(--fv-color-text-primary)]',
              'disabled:opacity-50'
            )}
          >
            Sign Up
          </button>
        </div>
        
        {/* Forms */}
        <div role="tabpanel">
          {mode === 'login' ? (
            <LoginForm
              onSubmit={onLogin}
              isLoading={isLoading}
              error={error}
              onForgotPassword={onForgotPassword}
            />
          ) : (
            <RegisterForm
              onSubmit={onRegister}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

