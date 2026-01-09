/**
 * Email Verification Landing Page
 * 
 * Handles email verification after registration.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api-client';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [streamSlug, setStreamSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    void verifyToken(token);
  }, [token]);

  const verifyToken = async (tokenValue: string) => {
    try {
      const response = await apiRequest<{
        success: boolean;
        message: string;
        viewerId?: string;
        streamId?: string;
        reason?: string;
        resent?: boolean;
      }>(`/public/direct/verify?token=${tokenValue}`, {
        method: 'GET',
      });

      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
        // If streamId is available, redirect to that stream
        // For now, we'll just show success
      } else {
        if (response.reason === 'expired' && response.resent) {
          setStatus('expired');
          setMessage(response.message || 'Link expired. We sent you a fresh verification email!');
        } else {
          setStatus('error');
          setMessage(response.message || 'Verification failed');
        }
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify email');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
      data-testid="page-verify-email"
    >
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        {status === 'loading' && (
          <div data-testid="loading-verification">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div data-testid="success-verification">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Email Verified!</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <p className="text-sm text-gray-600 mb-4">
              You can now access the stream and participate in chat.
            </p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              data-testid="btn-return-to-stream"
            >
              Return to Stream
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div data-testid="expired-verification">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-orange-600 mb-2">Link Expired</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <p className="text-sm text-gray-600 mb-4">
              Check your email for the new verification link we just sent!
            </p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              data-testid="btn-back"
            >
              Go Back
            </button>
          </div>
        )}

        {status === 'error' && (
          <div data-testid="error-verification">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <p className="text-sm text-gray-600 mb-4">
              Please try registering again or contact support if the issue persists.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-semibold"
              data-testid="btn-home"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

