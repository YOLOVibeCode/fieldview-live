/**
 * PasswordInput Component
 * 
 * Password input with show/hide toggle
 * Mobile-optimized with accessibility
 * 
 * Usage:
 * ```tsx
 * <PasswordInput
 *   name="password"
 *   label="Password"
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 *   error={errors.password}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/v2/primitives';

export interface PasswordInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * PasswordInput Component
 * 
 * Secure password input with visibility toggle
 */
export function PasswordInput({
  name,
  label = 'Password',
  placeholder = 'Enter your password',
  value,
  error,
  disabled = false,
  required = false,
  onChange,
  onBlur,
  className,
  'data-testid': dataTestId,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${name}-error`;
  
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        'space-y-1',
        error && 'error',
        className
      )}
    >
      {/* Label */}
      <label
        htmlFor={name}
        className="block text-sm font-medium text-[var(--fv-color-text-primary)]"
      >
        {label}
        {required && <span className="text-[var(--fv-color-error)] ml-1">*</span>}
      </label>
      
      {/* Input Container */}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // Base styles
            'w-full h-11 px-4 pr-12 rounded-lg',
            'bg-[var(--fv-color-bg-elevated)]',
            'border-2',
            'text-[var(--fv-color-text-primary)]',
            'placeholder:text-[var(--fv-color-text-muted)]',
            
            // States
            'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)] focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            
            // Error state
            error
              ? 'border-[var(--fv-color-error)] focus:ring-[var(--fv-color-error)]'
              : 'border-[var(--fv-color-border)]',
            
            // Transition
            'transition-colors duration-[var(--fv-duration-fast)]'
          )}
        />
        
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'p-1 rounded',
            'text-[var(--fv-color-text-muted)]',
            'hover:text-[var(--fv-color-text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--fv-color-primary-500)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-[var(--fv-duration-fast)]'
          )}
        >
          <Icon name={showPassword ? 'close' : 'chevron-right'} size="sm" />
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[var(--fv-color-error)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

