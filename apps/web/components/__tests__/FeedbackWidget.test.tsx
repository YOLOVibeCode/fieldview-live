/**
 * Tests for the Noctusoft feedback widget tag.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { FeedbackWidget, FEEDBACK_PRODUCT_KEY, FEEDBACK_WIDGET_SRC } from '../FeedbackWidget';

// next/script injects into <head> after hydration; render it as a plain <script>
// so the attributes the relay depends on can be asserted directly.
vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => <script {...props} />,
}));

describe('FeedbackWidget', () => {
  it('renders the relay widget tag for the fieldview product', () => {
    render(<FeedbackWidget />);

    const tag = screen.getByTestId('script-feedback-widget');
    expect(tag.tagName).toBe('SCRIPT');
    expect(tag).toHaveAttribute('src', FEEDBACK_WIDGET_SRC);
    expect(tag).toHaveAttribute('src', 'https://store.noctusoft.com/feedback/widget.js');
    expect(tag).toHaveAttribute('data-product', FEEDBACK_PRODUCT_KEY);
    expect(tag).toHaveAttribute('data-product', 'fieldview');
    expect(tag).toHaveAttribute('strategy', 'afterInteractive');
  });

  it('does not pass user identity when the layout has none', () => {
    render(<FeedbackWidget />);

    const tag = screen.getByTestId('script-feedback-widget');
    expect(tag).not.toHaveAttribute('data-email');
    expect(tag).not.toHaveAttribute('data-name');
  });
});
