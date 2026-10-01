import type { Metadata } from 'next';
import { SMS_BRAND, SMS_SUPPORT_EMAIL } from '@fieldview/data-model';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${SMS_BRAND}`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-neutral dark:prose-invert" data-testid="page-privacy">
      <h1>Privacy Policy</h1>
      <p>Last updated: October 1, 2026</p>
      <p>
        {SMS_BRAND} (&quot;we&quot;, &quot;us&quot;) operates the FieldView.Live streaming platform. This policy describes how we
        handle personal information, including mobile phone numbers used for SMS.
      </p>

      <h2>Text messages</h2>
      <p>
        With your opt-in consent, we may send SMS about game alerts, score updates, and payment links related to youth
        sports streams you follow or purchase. Message frequency varies. Message and data rates may apply. Reply STOP to
        opt out or HELP for help at any time.
      </p>
      <p data-testid="privacy-sms-third-party">
        We do not share, sell, or provide your mobile phone number or SMS opt-in data to third parties or affiliates for marketing or promotional purposes.
      </p>
      <p>
        For questions about this policy or your data, contact{' '}
        <a href={`mailto:${SMS_SUPPORT_EMAIL}`}>{SMS_SUPPORT_EMAIL}</a>.
      </p>
    </main>
  );
}
