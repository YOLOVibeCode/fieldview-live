/**
 * RegisterForm Component
 * 
 * Email/name registration form with validation
 * 
 * Usage:
 * ```tsx
 * <RegisterForm
 *   onSubmit={(data) => register(data)}
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

export interface RegisterFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * RegisterForm Component
 * 
 * Simple registration form
 */
export function RegisterForm({
  onSubmit,
  isLoading = false,
  error,
  className,
}: RegisterFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      data-testid="register-form"
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
      
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        {/* First Name */}
        <div className="space-y-1">
          <label htmlFor="firstName" className="block text-sm font-medium text-[var(--fv-color-text-primary)]">
            First Name <span className="text-[var(--fv-color-error)]">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
            disabled={isLoading}
            required
            className={cn(
              'w-full h-11 px-4 rounded-lg',
              'bg-[var(--fv-color-bg-elevated)]',
              'border-2',
              'text-[var(--fv-color-text-primary)]',
              'placeholder:text-[var(--fv-color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)] focus:border-transparent',
              'disabled:opacity-50',
              errors.firstName ? 'border-[var(--fv-color-error)]' : 'border-[var(--fv-color-border)]'
            )}
          />
          {errors.firstName && (
            <p role="alert" className="text-xs text-[var(--fv-color-error)]">{errors.firstName}</p>
          )}
        </div>
        
        {/* Last Name */}
        <div className="space-y-1">
          <label htmlFor="lastName" className="block text-sm font-medium text-[var(--fv-color-text-primary)]">
            Last Name <span className="text-[var(--fv-color-error)]">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
            disabled={isLoading}
            required
            className={cn(
              'w-full h-11 px-4 rounded-lg',
              'bg-[var(--fv-color-bg-elevated)]',
              'border-2',
              'text-[var(--fv-color-text-primary)]',
              'placeholder:text-[var(--fv-color-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)] focus:border-transparent',
              'disabled:opacity-50',
              errors.lastName ? 'border-[var(--fv-color-error)]' : 'border-[var(--fv-color-border)]'
            )}
          />
          {errors.lastName && (
            <p role="alert" className="text-xs text-[var(--fv-color-error)]">{errors.lastName}</p>
          )}
        </div>
      </div>
      
      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-[var(--fv-color-text-primary)]">
          Email <span className="text-[var(--fv-color-error)]">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
          disabled={isLoading}
          required
          className={cn(
            'w-full h-11 px-4 rounded-lg',
            'bg-[var(--fv-color-bg-elevated)]',
            'border-2',
            'text-[var(--fv-color-text-primary)]',
            'placeholder:text-[var(--fv-color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)] focus:border-transparent',
            'disabled:opacity-50',
            errors.email ? 'border-[var(--fv-color-error)]' : 'border-[var(--fv-color-border)]'
          )}
        />
        {errors.email && (
          <p role="alert" className="text-xs text-[var(--fv-color-error)]">{errors.email}</p>
        )}
      </div>
      
      {/* Password */}
      <PasswordInput
        name="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        disabled={isLoading}
        required
        error={errors.password}
      />
      
      {/* Submit Button */}
      <TouchButton
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </TouchButton>
    </form>
  );
}

