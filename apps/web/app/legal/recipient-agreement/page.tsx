export const metadata = {
  title: 'Recipient (Payouts) Agreement — FieldView',
};

/**
 * Static Recipient Agreement page (v1), linked from the owner payouts onboarding
 * (/owners/payments). Text mirrors docs/legal/RECIPIENT-AGREEMENT-v1.md.
 * DRAFT — pending attorney review before go-live.
 */
export default function RecipientAgreementPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
          Draft — this agreement is pending legal review. Version <span className="font-mono">v1</span>.
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">FieldView Recipient (Payouts) Agreement</h1>
          <p className="text-sm text-muted-foreground mt-1">Effective version: v1</p>
        </div>

        <p className="text-sm text-muted-foreground">
          By connecting your Square account through FieldView, you (&quot;Recipient&quot;) agree to the following:
        </p>

        <ol className="list-decimal pl-5 space-y-4 text-sm leading-relaxed">
          <li>
            <strong>You are the seller.</strong> Viewers&apos; payments for your streams settle directly into your
            own Square merchant account. FieldView never takes possession of your funds.
          </li>
          <li>
            <strong>Platform fee.</strong> FieldView retains a platform application fee (default 10%) on each
            transaction, applied by Square at the time of charge. The remainder settles to your Square balance.
            Square&apos;s own processing fees apply per your Square agreement.
          </li>
          <li>
            <strong>Your Square account.</strong> You are responsible for maintaining your Square account in good
            standing, for the accuracy of your business/location information, and for any taxes on your earnings.
            Payouts to your bank follow Square&apos;s payout schedule.
          </li>
          <li>
            <strong>Refunds &amp; disputes.</strong> Refunds (full or partial) may be issued for a transaction;
            Square reverses the platform fee proportionally. You are responsible for chargebacks and disputes on
            your merchant account per Square&apos;s terms.
          </li>
          <li>
            <strong>Content &amp; conduct.</strong> You are responsible for the streams you sell and for complying
            with applicable law and the rights of others (including broadcast/venue rights). FieldView may suspend
            payouts or access for violations.
          </li>
          <li>
            <strong>Termination.</strong> Either party may end this arrangement. You may disconnect Square at any
            time; doing so stops new charges to your account through FieldView.
          </li>
          <li>
            <strong>No warranty; limitation of liability.</strong> FieldView provides the platform &quot;as is.&quot;
            To the extent permitted by law, FieldView is not liable for indirect or consequential damages arising
            from the payments integration.
          </li>
        </ol>

        <p className="text-sm text-muted-foreground">
          Questions: <a href="mailto:support@fieldview.live" className="underline">support@fieldview.live</a>
        </p>
      </main>
    </div>
  );
}
