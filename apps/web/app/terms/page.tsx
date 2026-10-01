import type { Metadata } from 'next';
import { SMS_BRAND, SMS_PURPOSE_PHRASE, SMS_SUPPORT_EMAIL } from '@fieldview/data-model';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of service for ${SMS_BRAND}`,
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-neutral dark:prose-invert" data-testid="page-terms">
      <h1>Terms of Service</h1>
      <p>Last updated: October 1, 2026</p>

      <section id="sms" data-testid="section-terms-sms">
        <h2>SMS program</h2>
        <p>
          <strong>Program name:</strong> {SMS_BRAND} SMS Alerts
        </p>
        <p>
          <strong>Description:</strong> We send {SMS_PURPOSE_PHRASE} for youth sports live streams on {SMS_BRAND}.
        </p>
        <p>
          <strong>How to opt in:</strong> Check the SMS opt-in box when you provide your mobile number on our checkout,
          subscription, or score-alert forms. You may also text a game keyword to our toll-free number to receive a
          payment link.
        </p>
        <p>Message frequency varies.</p>
        <p>Message and data rates may apply.</p>
        <p>Reply STOP to opt out; reply HELP for help.</p>
        <p>
          <strong>Support:</strong>{' '}
          <a href={`mailto:${SMS_SUPPORT_EMAIL}`}>{SMS_SUPPORT_EMAIL}</a>
        </p>
        <p>Carriers are not liable for delayed or undelivered messages.</p>
      </section>
    </main>
  );
}
