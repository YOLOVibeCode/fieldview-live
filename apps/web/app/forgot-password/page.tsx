'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

// Validation schema
const requestResetSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  userType: z.enum(['owner_user', 'admin_account'], {
    required_error: 'Please select account type',
  }),
});

type RequestResetForm = z.infer<typeof requestResetSchema>;

export default function RequestPasswordResetPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RequestResetForm>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      userType: 'owner_user',
    },
  });

  const onSubmit = async (data: RequestResetForm) => {
    setSubmitState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 429) {
        // Rate limited
        setSubmitState('error');
        setErrorMessage(result.message || 'Too many requests. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      // Always show success (email enumeration protection)
      setSubmitState('success');
      reset();
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    }
  };

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
            Reset Password
          </h2>
          <p className="text-slate-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Success Message */}
        {submitState === 'success' && (
          <div
            className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg"
            data-testid="success-message"
          >
            <p className="text-green-400 text-sm">
              ✓ If an account exists with that email, you will receive a password reset link shortly.
              Please check your inbox.
            </p>
          </div>
        )}

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

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800"
          data-testid="form-password-reset-request"
        >
          {/* Account Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Account Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  value="owner_user"
                  {...register('userType')}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-2"
                  data-testid="radio-owner-user"
                />
                <span className="ml-3 text-slate-200">Team Owner / Staff</span>
              </label>
              <label className="flex items-center p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="radio"
                  value="admin_account"
                  {...register('userType')}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-2"
                  data-testid="radio-admin-account"
                />
                <span className="ml-3 text-slate-200">🔒 Super Admin</span>
              </label>
            </div>
            {errors.userType && (
              <p className="mt-2 text-sm text-red-400" data-testid="error-userType">
                {errors.userType.message}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors ${
                errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-700 focus:ring-blue-500'
              }`}
              placeholder="you@example.com"
              disabled={submitState === 'loading'}
              data-testid="input-email"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400" data-testid="error-email">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitState === 'loading'}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-submit"
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
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              data-testid="link-back-to-login"
            >
              ← Back to Login
            </Link>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@fieldview.live" className="text-blue-400 hover:text-blue-300">
              support@fieldview.live
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

