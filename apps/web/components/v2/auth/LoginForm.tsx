/**
 * LoginForm Component
 * 
 * Email/password login form with validation
 * 
 * Usage:
 * ```tsx
 * <LoginForm
 *   onSubmit={(data) => login(data)}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TouchButton } from '@/components/v2/primitives';
import { PasswordInput } from './PasswordInput';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading?: boolean;
  error?: string | null;
  onForgotPassword?: () => void;
  className?: string;
}

/**
 * LoginForm Component
 * 
 * Simple login form with email and password
 */
export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  onForgotPassword,
  className,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit({ email, password, rememberMe });
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      data-testid="login-form"
      className={cn('space-y-4', className)}
    >
      {/* Server Error */}
      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[var(--fv-color-error)]/10 border border-[var(--fv-color-error)] text-sm text-[var(--fv-color-error)]"
        >
          {error}
        </div>
      )}
      
      {/* Email */}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--fv-color-text-primary)]"
        >
          Email <span className="text-[var(--fv-color-error)]">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          required
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={cn(
            'w-full h-11 px-4 rounded-lg',
            'bg-[var(--fv-color-bg-elevated)]',
            'border-2',
            'text-[var(--fv-color-text-primary)]',
            'placeholder:text-[var(--fv-color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)] focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.email
              ? 'border-[var(--fv-color-error)]'
              : 'border-[var(--fv-color-border)]'
          )}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-xs text-[var(--fv-color-error)]">
            {errors.email}
          </p>
        )}
      </div>
      
      {/* Password */}
      <PasswordInput
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        required
        error={errors.password}
      />
      
      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-[var(--fv-color-border)] text-[var(--fv-color-primary-500)] focus:ring-2 focus:ring-[var(--fv-color-primary-500)]"
          />
          <span className="text-[var(--fv-color-text-secondary)]">Remember me</span>
        </label>
        
        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isLoading}
            className="text-[var(--fv-color-primary-500)] hover:underline disabled:opacity-50"
          >
            Forgot password?
          </button>
        )}
      </div>
      
      {/* Submit Button */}
      <TouchButton
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </TouchButton>
    </form>
  );
}

