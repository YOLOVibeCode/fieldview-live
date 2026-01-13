'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Password validation schema (matches backend)
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifyState, setVerifyState] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('newPassword');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifyState('invalid');
      setErrorMessage('No reset token provided');
      return;
    }

    const verifyToken = async () => {
      setVerifyState('verifying');
      try {
        const response = await fetch(`/api/auth/password-reset/verify/${token}`);
        const result = await response.json();

        if (response.ok && result.success) {
          setVerifyState('valid');
        } else {
          setVerifyState('invalid');
          setErrorMessage(result.message || 'Invalid or expired reset link');
        }
      } catch (error) {
        setVerifyState('invalid');
        setErrorMessage('Failed to verify reset link');
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setSubmitState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSubmitState('success');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 5) return { strength: 3, label: 'Good', color: 'bg-blue-500' };
    return { strength: 4, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password || '');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              FieldView.Live
            </h1>
          </Link>
          <h2 className="text-2xl font-semibold text-slate-100 mb-2">
            Set New Password
          </h2>
          <p className="text-slate-400">
            Choose a strong password for your account
          </p>
        </div>

        {/* Verifying State */}
        {verifyState === 'verifying' && (
          <div className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mb-4"></div>
            <p className="text-slate-300">Verifying reset link...</p>
          </div>
        )}

        {/* Invalid Token */}
        {verifyState === 'invalid' && (
          <div className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <span className="text-3xl">✕</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Invalid Reset Link</h3>
              <p className="text-slate-400">{errorMessage}</p>
            </div>
            <Link
              href="/forgot-password"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 text-center transition-all"
            >
              Request New Link
            </Link>
          </div>
        )}

        {/* Success State */}
        {submitState === 'success' && (
          <div className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800" data-testid="success-state">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Password Reset Successful!</h3>
              <p className="text-slate-400">Redirecting you to login...</p>
            </div>
          </div>
        )}

        {/* Reset Form */}
        {verifyState === 'valid' && submitState !== 'success' && (
          <>
            {/* Error Message */}
            {submitState === 'error' && errorMessage && (
              <div
                className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg"
                data-testid="error-message"
              >
                <p className="text-red-400 text-sm">
                  ✕ {errorMessage}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800"
              data-testid="form-reset-password"
            >
              {/* New Password */}
              <div className="mb-6">
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    {...register('newPassword')}
                    className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors pr-12 ${
                      errors.newPassword
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-700 focus:ring-blue-500'
                    }`}
                    placeholder="Enter new password"
                    disabled={submitState === 'loading'}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    data-testid="btn-toggle-password"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-2 text-sm text-red-400" data-testid="error-new-password">
                    {errors.newPassword.message}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {password && password.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">Password Strength:</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength.strength === 1 ? 'text-red-400' :
                        passwordStrength.strength === 2 ? 'text-yellow-400' :
                        passwordStrength.strength === 3 ? 'text-blue-400' :
                        'text-green-400'
                      }`} data-testid="password-strength-label">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.strength ? passwordStrength.color : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors pr-12 ${
                      errors.confirmPassword
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-700 focus:ring-blue-500'
                    }`}
                    placeholder="Confirm new password"
                    disabled={submitState === 'loading'}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    data-testid="btn-toggle-confirm-password"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-400" data-testid="error-confirm-password">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="mb-6 p-4 bg-slate-800 rounded-lg">
                <p className="text-xs font-medium text-slate-300 mb-2">Password Requirements:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center">
                    <span className={password && password.length >= 8 ? 'text-green-400' : ''}>
                      {password && password.length >= 8 ? '✓' : '○'} At least 8 characters
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className={password && /[A-Z]/.test(password) ? 'text-green-400' : ''}>
                      {password && /[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className={password && /[a-z]/.test(password) ? 'text-green-400' : ''}>
                      {password && /[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className={password && /[0-9]/.test(password) ? 'text-green-400' : ''}>
                      {password && /[0-9]/.test(password) ? '✓' : '○'} One number
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className={password && /[^a-zA-Z0-9]/.test(password) ? 'text-green-400' : ''}>
                      {password && /[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} One special character
                    </span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitState === 'loading'}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-submit-reset"
              >
                {submitState === 'loading' ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

