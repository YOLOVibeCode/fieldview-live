import Script from 'next/script';

/**
 * Noctusoft cross-product feedback widget.
 *
 * One tag renders a floating "Feedback" button and posts submissions to the
 * relay's public feedback route. The relay accepts posts only from
 * fieldview.live, its subdomains, and localhost, so there is no server route,
 * key, or env var on our side. Mounted once in the root layout so it shows on
 * every page.
 */
export const FEEDBACK_WIDGET_SRC = 'https://store.noctusoft.com/feedback/widget.js';
export const FEEDBACK_PRODUCT_KEY = 'fieldview';

export function FeedbackWidget() {
  return (
    <Script
      src={FEEDBACK_WIDGET_SRC}
      data-product={FEEDBACK_PRODUCT_KEY}
      data-testid="script-feedback-widget"
      strategy="afterInteractive"
    />
  );
}
