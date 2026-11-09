export const metadata = {
  title: 'Recipient (Payouts) Agreement — FieldView',
};

const STRIPE_CONNECTED_ACCOUNT_AGREEMENT = 'https://stripe.com/connect-account/legal';

/**
 * Static Recipient Agreement page (v2), linked from the owner payouts onboarding
 * (/owners/payments). Text mirrors docs/legal/RECIPIENT-AGREEMENT-v2.md: Stripe Connect
 * through the Noctusoft Store, a 10% platform fee, Stripe's fees and disputes on the
 * coach's own account. DRAFT — pending attorney review.
 */
export default function RecipientAgreementPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
          Draft — this agreement is pending legal review. Version <span className="font-mono">v2</span> (supersedes v1).
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">FieldView Recipient (Payouts) Agreement</h1>
          <p className="text-sm text-muted-foreground mt-1">Effective version: v2</p>
        </div>

        <p className="text-sm text-muted-foreground">
          FieldView.Live (&quot;FieldView&quot;) is operated by Noctusoft, Inc. (&quot;Noctusoft&quot;, &quot;we&quot;,
          &quot;us&quot;). Payments for FieldView run through the Noctusoft Store (store.noctusoft.com), the checkout and
          payout service Noctusoft operates for its apps, with Stripe as the payment processor. By accepting this
          agreement and setting up payouts, you (the &quot;Recipient&quot;, &quot;you&quot;) agree to the following:
        </p>

        <ol className="list-decimal pl-5 space-y-4 text-sm leading-relaxed">
          <li>
            <strong>You are the seller.</strong> When a viewer buys access to one of your streams or games, the charge is
            made directly on your own Stripe account, a connected account that Noctusoft opens for you on Stripe when you
            set up payouts. You are the merchant for the sale. Noctusoft never holds your money; it receives only the
            platform fee described in section 3.
          </li>
          <li>
            <strong>Your Stripe account.</strong> To receive payouts you complete Stripe&apos;s onboarding (identity,
            business details and a bank account) and accept the{' '}
            <a href={STRIPE_CONNECTED_ACCOUNT_AGREEMENT} className="underline" target="_blank" rel="noreferrer">
              Stripe Connected Account Agreement
            </a>
            , which governs your relationship with Stripe. Your account has no separate Stripe login; you reach it through
            FieldView. Keep your information accurate and your account in good standing. Stripe may ask you for more
            information at any time and may pause charges or payouts until you provide it.
          </li>
          <li>
            <strong>Platform fee.</strong> Noctusoft keeps a platform fee of 10% of each purchase price, collected by
            Stripe as an application fee at the moment of the charge. We may change the fee for future sales with notice
            through FieldView.
          </li>
          <li>
            <strong>Processing fees.</strong> Stripe&apos;s processing fees, at Stripe&apos;s then-current rates for your
            account, are deducted from your account on each charge, in addition to the platform fee. For illustration, at
            Stripe&apos;s rates when this version was written, a $1.00 sale leaves about $0.57 to you after a $0.10
            platform fee and about $0.33 in Stripe fees.
          </li>
          <li>
            <strong>Payouts.</strong> Stripe pays your available balance to your bank account on Stripe&apos;s payout
            schedule for your account (currently daily, after Stripe&apos;s settlement delay; the first payout to a new
            account can take longer). Noctusoft does not control payout timing and does not handle your money on its way
            to your bank.
          </li>
          <li>
            <strong>Refunds, disputes and negative balances.</strong> Noctusoft can refund a sale, in full or in part, at
            your request or where FieldView&apos;s viewer terms require it (for example when a stream never aired). When
            a sale is refunded, the platform fee on the refunded amount is returned to you; Stripe&apos;s processing fee
            is not. Chargebacks and disputes on your sales, and any dispute fees, are charged to your account under
            Stripe&apos;s terms. If your account balance goes negative, Stripe may recover the amount from your later
            sales or your bank account, and you remain responsible for it.
          </li>
          <li>
            <strong>Taxes and records.</strong> You are responsible for all taxes on your earnings. Where the law
            requires, Stripe or Noctusoft may collect tax information from you and issue tax forms (for example IRS Form
            1099-K). FieldView keeps a record of each sale, fee and refund on your account.
          </li>
          <li>
            <strong>Viewers.</strong> Viewers pay on a checkout page hosted by Stripe for the Noctusoft Store and receive
            an emailed receipt. Their purchases are also governed by FieldView&apos;s Terms of Service.
          </li>
          <li>
            <strong>Content and conduct.</strong> You are responsible for the streams you sell: that you hold the rights
            to broadcast and sell them (including league, venue and broadcast rights, and any consents needed for minors
            who appear), and that they comply with the law and FieldView&apos;s Terms of Service. Noctusoft may suspend
            sales or access, and may refund affected purchases, for violations.
          </li>
          <li>
            <strong>Ending the arrangement.</strong> You may stop selling at any time and may ask us to disconnect your
            payout account; Noctusoft may also end this arrangement with notice. Ending it stops new charges through
            FieldView. Balances you have already earned still pay out under Stripe&apos;s schedule, less any refunds,
            disputes or negative balances, and your responsibilities for past sales continue.
          </li>
          <li>
            <strong>Changes to this agreement.</strong> This agreement is versioned. When it changes, FieldView asks you
            to accept the new version before you change your payout setup. We record the version you accepted, when you
            accepted it and the network address it was accepted from.
          </li>
          <li>
            <strong>No warranty; limitation of liability.</strong> FieldView and the Noctusoft Store are provided
            &quot;as is.&quot; Stripe, not Noctusoft, processes payments and holds your funds. To the extent permitted by
            law, Noctusoft is not liable for indirect or consequential damages arising from the payments integration.
            FieldView&apos;s Terms of Service govern anything this agreement does not address.
          </li>
        </ol>

        <p className="text-sm text-muted-foreground">
          Questions: <a href="mailto:support@fieldview.live" className="underline">support@fieldview.live</a>
        </p>
      </main>
    </div>
  );
}
