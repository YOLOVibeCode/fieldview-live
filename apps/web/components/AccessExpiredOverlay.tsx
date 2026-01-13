'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schema
const requestAccessSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

type RequestAccessForm = z.infer<typeof requestAccessSchema>;

interface AccessExpiredOverlayProps {
  streamTitle?: string;
  streamId?: string;
  onClose?: () => void;
}

export function AccessExpiredOverlay({ 
  streamTitle, 
  streamId,
  onClose 
}: AccessExpiredOverlayProps) {
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RequestAccessForm>({
    resolver: zodResolver(requestAccessSchema),
  });

  const onSubmit = async (data: RequestAccessForm) => {
    setSubmitState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/viewer-refresh/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          directStreamId: streamId,
          redirectUrl: window.location.pathname,
        }),
      });

      const result = await response.json();

      if (response.status === 429) {
        // Rate limited
        setSubmitState('error');
        setErrorMessage(result.message || 'Too many requests. Please try again later.');
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send access link');
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
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      data-testid="access-expired-overlay"
    >
      <div className="max-w-md w-full">
        {/* Success State */}
        {submitState === 'success' && (
          <div className="bg-slate-900 rounded-lg shadow-2xl p-8 border border-slate-800">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <svg 
                  className="w-10 h-10 text-green-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                Check Your Email
              </h3>
              <p className="text-slate-400 mb-6">
                We've sent you a link to continue watching. Please check your inbox.
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-slate-800 text-slate-200 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  data-testid="btn-close-success"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}

        {/* Request Form */}
        {submitState !== 'success' && (
          <div className="bg-slate-900 rounded-lg shadow-2xl p-8 border border-slate-800">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
                <svg 
                  className="w-10 h-10 text-yellow-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                Your Access Has Expired
              </h2>
              {streamTitle && (
                <p className="text-slate-400 mb-2">
                  {streamTitle}
                </p>
              )}
              <p className="text-sm text-slate-500">
                Enter your email to receive a new access link
              </p>
            </div>

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
            <form onSubmit={handleSubmit(onSubmit)} data-testid="form-request-access">
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
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
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
                  'Send Access Link'
                )}
              </button>

              {/* Cancel Button */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  data-testid="btn-cancel"
                >
                  Cancel
                </button>
              )}
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                We'll send you a secure link to continue watching. The link expires in 15 minutes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

