'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyAccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifyState, setVerifyState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifyState('error');
      setErrorMessage('No access token provided');
      return;
    }

    const verifyToken = async () => {
      setVerifyState('verifying');
      try {
        const response = await fetch(`/api/auth/viewer-refresh/verify/${token}`);
        const result = await response.json();

        if (response.ok && result.valid) {
          setVerifyState('success');
          setRedirectUrl(result.redirectUrl || '/');
          
          // Start countdown
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                router.push(result.redirectUrl || '/');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        } else {
          setVerifyState('error');
          setErrorMessage(result.error || 'Invalid or expired access link');
        }
      } catch (error) {
        setVerifyState('error');
        setErrorMessage('Failed to verify access link. Please try again.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              🎬 FieldView.Live
            </h1>
          </Link>
        </div>

        {/* Verifying State */}
        {verifyState === 'verifying' && (
          <div 
            className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800 text-center"
            data-testid="verifying-state"
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-blue-500 mb-6"></div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">
              Verifying Access
            </h2>
            <p className="text-slate-400">
              Please wait while we restore your viewing session...
            </p>
          </div>
        )}

        {/* Success State */}
        {verifyState === 'success' && (
          <div 
            className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800"
            data-testid="success-state"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
                <svg 
                  className="w-12 h-12 text-green-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                Access Restored!
              </h2>
              <p className="text-slate-400 mb-6">
                Your viewing session has been successfully restored.
              </p>
              
              {/* Countdown */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/30 mb-3">
                  <span className="text-3xl font-bold text-blue-400" data-testid="countdown">
                    {countdown}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Redirecting you to the stream...
                </p>
              </div>

              {/* Manual redirect button */}
              {redirectUrl && (
                <button
                  onClick={() => router.push(redirectUrl)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
                  data-testid="btn-continue"
                >
                  Continue Watching Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {verifyState === 'error' && (
          <div 
            className="bg-slate-900 rounded-lg shadow-xl p-8 border border-slate-800"
            data-testid="error-state"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
                <svg 
                  className="w-12 h-12 text-red-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                Access Link Invalid
              </h2>
              <p className="text-slate-400 mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  This access link may have expired or already been used.
                </p>
                <Link
                  href="/"
                  className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 text-center transition-all"
                  data-testid="btn-back-home"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Need help? Contact support at{' '}
            <a 
              href="mailto:support@fieldview.live" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              support@fieldview.live
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <VerifyAccessContent />
    </Suspense>
  );
}

