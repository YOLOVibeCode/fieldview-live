import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PaywallModal } from '../PaywallModal';

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('PaywallModal', () => {
  const defaultProps = {
    slug: 'test-stream',
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    priceInCents: 999,
  };

  it('shows payments unavailable message when paymentsReady is false', () => {
    render(
      <PaywallModal
        {...defaultProps}
        paymentsReady={false}
        paywallMessage="Premium access required"
      />,
    );

    expect(screen.getByTestId('error-payments-unavailable')).toHaveTextContent(
      'Payments not yet available for this stream',
    );
    expect(screen.getByTestId('paywall-custom-message')).toHaveTextContent('Premium access required');
    expect(screen.queryByTestId('btn-continue-to-payment')).not.toBeInTheDocument();
  });

  it('shows continue button when paymentsReady is undefined', () => {
    render(<PaywallModal {...defaultProps} />);

    expect(screen.getByTestId('btn-continue-to-payment')).toBeInTheDocument();
    expect(screen.queryByTestId('error-payments-unavailable')).not.toBeInTheDocument();
  });
});
