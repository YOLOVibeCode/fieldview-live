import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PaywallModal } from '../PaywallModal';
import { apiRequest } from '@/lib/api-client';

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

  it('lets a buyer email themselves the watch link', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ sent: true });
    render(<PaywallModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('btn-paywall-already-paid'));
    fireEvent.change(screen.getByTestId('input-access-link-email'), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByTestId('btn-send-access-link'));

    await waitFor(() => expect(screen.getByTestId('access-link-sent')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/direct/test-stream/access-link',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'buyer@example.com' }) }),
    );
  });

  it('offers the watch-link email even when payments are unavailable', () => {
    render(<PaywallModal {...defaultProps} paymentsReady={false} />);
    expect(screen.getByTestId('btn-paywall-already-paid')).toBeInTheDocument();
  });
});
