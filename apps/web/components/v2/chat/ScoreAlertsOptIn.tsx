'use client';

import { useState } from 'react';
import { subscribeScoreAlerts } from '@/lib/api/gameEvents';

export function ScoreAlertsOptIn({ slug }: { slug: string }) {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setStatus('saving');
    setError(null);
    try {
      const digits = phone.replace(/\D/g, '');
      const e164 = phone.startsWith('+') ? phone : `+1${digits}`;
      await subscribeScoreAlerts(slug, e164);
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not subscribe');
    }
  };

  return (
    <form
      data-testid="form-score-alerts"
      className="space-y-2 rounded-lg border border-white/10 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="score-alert-phone" className="block text-xs text-white/70">
        Get score alerts by text
      </label>
      <input
        id="score-alert-phone"
        data-testid="input-score-alert-phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+15555550100"
        className="w-full rounded-md bg-black/40 px-2 py-1 text-sm text-white"
        aria-label="Phone number for score alerts"
      />
      <button
        type="submit"
        data-testid="btn-subscribe-score-alerts"
        data-loading={status === 'saving'}
        disabled={status === 'saving'}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
      >
        {status === 'ok' ? 'Subscribed' : 'Notify me'}
      </button>
      {error && (
        <p data-testid="error-score-alerts" role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
