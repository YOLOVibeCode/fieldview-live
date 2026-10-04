import { SMS_BRAND, SMS_SUPPORT_EMAIL } from '@fieldview/data-model';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SmsOptInPageForm } from '@/components/SmsOptInPageForm';

export const metadata: Metadata = {
  title: 'Text messages',
  description: `Opt in to ${SMS_BRAND} game alerts, score updates, and payment links by text message.`,
};

export default function SmsOptInPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="page-sms">
      <h1 className="text-3xl font-bold">Text messages from {SMS_BRAND}</h1>
      <p className="mt-4 text-muted-foreground">
        {SMS_BRAND} streams youth sports games. Parents and fans can choose to get game alerts, score updates, and
        payment links by text for the teams and games they follow or buy. These are messages about games you chose,
        not marketing.
      </p>

      <ul className="mt-6 list-disc space-y-1 pl-6 text-sm" data-testid="sms-program-facts">
        <li>Every message starts with &quot;{SMS_BRAND}:&quot;.</li>
        <li>Message frequency varies with the games you follow.</li>
        <li>Message and data rates may apply.</li>
        <li>Reply STOP to opt out at any time, or HELP for help.</li>
        <li>
          Support:{' '}
          <a href={`mailto:${SMS_SUPPORT_EMAIL}`} className="underline underline-offset-2">
            {SMS_SUPPORT_EMAIL}
          </a>
        </li>
        <li>
          We do not share, sell, or provide your mobile phone number or SMS opt-in data to third parties or affiliates
          for marketing or promotional purposes.
        </li>
      </ul>

      <section className="mt-8 rounded-lg border p-6" aria-labelledby="sms-opt-in-heading">
        <h2 id="sms-opt-in-heading" className="text-lg font-semibold">
          Opt in
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The same box appears wherever {SMS_BRAND} asks for a phone number: score alerts, game subscriptions, and
          checkout. It is never checked for you, and you can watch or buy without it.
        </p>
        <div className="mt-4">
          <SmsOptInPageForm />
        </div>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        Full details:{' '}
        <Link href="/terms#sms" className="underline underline-offset-2">
          SMS Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
