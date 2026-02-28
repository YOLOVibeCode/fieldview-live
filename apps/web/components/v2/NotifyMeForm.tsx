'use client';

import { useState, useCallback, useEffect } from 'react';

export interface NotifyMeFormProps {
  slug: string;
  apiBase: string;
  /** When provided, show one-tap subscribe with this email (authenticated user). */
  viewerEmail?: string | null;
  /** When provided with viewerEmail, POST uses this instead of email. */
  viewerIdentityId?: string | null;
  /** Display name for one-tap copy (optional). */
  viewerName?: string | null;
  /** Called after successful subscribe when backend returns viewerId (e.g. to set global auth). */
  onViewerCreated?: (viewerId: string, email: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotifyMeForm({
  slug,
  apiBase,
  viewerEmail,
  viewerIdentityId,
  viewerName,
  onViewerCreated,
}: NotifyMeFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusChecked, setStatusChecked] = useState(false);
  const [statusError, setStatusError] = useState(false);

  const isAuthenticated = !!viewerEmail?.trim();
  const effectiveEmail = (viewerEmail?.trim() || email.trim()).toLowerCase();
  const isValid = EMAIL_RE.test(effectiveEmail);

  // When authenticated, check if already subscribed so we can show success state
  useEffect(() => {
    if (!viewerIdentityId || !slug || statusChecked) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/public/direct/${slug}/notify-me/status?viewerIdentityId=${encodeURIComponent(viewerIdentityId)}`,
        );
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { subscribed?: boolean };
          if (data.subscribed) {
            setStatus('success');
          }
        }
      } catch {
        if (!cancelled) setStatusError(true);
      } finally {
        if (!cancelled) setStatusChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerIdentityId, slug, apiBase, statusChecked]);

  const handleSubmit = useCallback(async () => {
    if (status === 'loading') return;
    const useId = isAuthenticated && viewerIdentityId;
    if (useId && !viewerIdentityId) return;
    if (!useId && !isValid) return;

    setStatus('loading');

    try {
      const body = useId
        ? { viewerIdentityId }
        : { email: effectiveEmail };
      const res = await fetch(
        `${apiBase}/api/public/direct/${slug}/notify-me`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        setStatus('error');
        return;
      }

      const data = (await res.json()) as { status: string; viewerId: string };
      setStatus('success');
      // Only notify parent when user subscribed with email (lightweight registration)
      if (!useId && data.viewerId && effectiveEmail && onViewerCreated) {
        onViewerCreated(data.viewerId, effectiveEmail);
      }
    } catch {
      setStatus('error');
    }
  }, [
    slug,
    apiBase,
    status,
    isValid,
    effectiveEmail,
    isAuthenticated,
    viewerIdentityId,
    onViewerCreated,
  ]);

  const handleUnsubscribe = useCallback(async () => {
    if (!viewerIdentityId || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch(
        `${apiBase}/api/public/direct/${slug}/notify-me`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewerIdentityId }),
        },
      );
      if (res.ok || res.status === 404) {
        setStatus('idle');
      }
    } catch {
      setStatus('success'); // Keep success UI on network error
    }
  }, [slug, apiBase, viewerIdentityId, status]);

  if (status === 'success') {
    return (
      <div
        className="flex flex-col gap-2 text-green-400 text-sm"
        data-testid="notify-me-success"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>You&apos;ll be notified when the stream starts!</span>
        </div>
        {viewerIdentityId && (
          <button
            type="button"
            onClick={handleUnsubscribe}
            className="text-xs text-white/70 hover:text-white underline self-start"
            data-testid="btn-unsubscribe"
            aria-label="Unsubscribe from stream start notification"
          >
            Unsubscribe
          </button>
        )}
      </div>
    );
  }

  // One-tap mode: authenticated user with email
  if (isAuthenticated && viewerEmail) {
    return (
      <div className="flex flex-col gap-2" data-testid="form-notify-me">
        {statusError && (
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <span data-testid="error-notify-me-status">Couldn&apos;t check subscription status.</span>
            <button
              type="button"
              onClick={() => { setStatusError(false); setStatusChecked(false); }}
              className="underline hover:text-amber-300"
              data-testid="btn-retry-status"
              aria-label="Retry checking subscription status"
            >
              Retry
            </button>
          </div>
        )}
        <p className="text-sm text-white/90">
          Notify <strong className="text-white">{viewerEmail}</strong> when the stream starts?
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === 'loading'}
          data-testid="btn-notify-me-subscribe"
          data-loading={status === 'loading'}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Subscribe to stream start notification"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
        {status === 'error' && (
          <p className="text-red-400 text-xs" data-testid="error-notify-me" role="alert">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    );
  }

  // Email form for unauthenticated users
  return (
    <div className="flex flex-col gap-2" data-testid="form-notify-me">
      <label htmlFor="notify-me-email" className="sr-only">
        Email for stream start notification
      </label>
      <input
        id="notify-me-email"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-blue-400"
        data-testid="input-email"
        aria-describedby={status === 'error' ? 'notify-me-error' : undefined}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || status === 'loading'}
        data-testid="btn-notify-me"
        data-loading={status === 'loading'}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Notify me when the stream starts"
      >
        {status === 'loading' ? 'Sending...' : 'Notify Me'}
      </button>
      {status === 'error' && (
        <p id="notify-me-error" className="text-red-400 text-xs" data-testid="error-notify-me" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
