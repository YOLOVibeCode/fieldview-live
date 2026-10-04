'use client';

import { SMS_BRAND } from '@fieldview/data-model';
import { useState } from 'react';

import { SmsOptInCheckbox } from '@/components/SmsOptInCheckbox';
import { apiRequest } from '@/lib/api-client';

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'done' } | { kind: 'error'; message: string };

/** Opt-in form on the public /sms page: mobile number + the product's unchecked consent box. */
export function SmsOptInPageForm() {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setStatus({ kind: 'error', message: 'Check the box to agree to text messages.' });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      await apiRequest<{ ok: boolean }>('/api/public/sms/opt-in', {
        method: 'POST',
        body: JSON.stringify({ phone, consent, website }),
      });
      setStatus({ kind: 'done' });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
      setStatus({ kind: 'error', message });
    }
  }

  if (status.kind === 'done') {
    return (
      <p className="rounded-md border border-green-600/30 bg-green-50 p-4 text-sm text-green-900" data-testid="sms-opt-in-done">
        You&apos;re opted in. {SMS_BRAND} may text you game alerts, score updates, and payment links. Message frequency
        varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="form-sms-opt-in" noValidate>
      <div className="space-y-1">
        <label htmlFor="sms-phone" className="block text-sm font-medium">
          Mobile number
        </label>
        <input
          id="sms-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(817) 555-0100"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
          data-testid="input-sms-phone"
          required
        />
      </div>
      <SmsOptInCheckbox checked={consent} onChange={setConsent} />
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {status.kind === 'error' && (
        <p className="text-sm text-red-600" role="alert" data-testid="sms-opt-in-error">
          {status.message}
        </p>
      )}
      <button
        type="submit"
        disabled={status.kind === 'saving'}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
        data-testid="btn-sms-opt-in"
      >
        {status.kind === 'saving' ? 'Saving…' : 'Agree and subscribe'}
      </button>
    </form>
  );
}
