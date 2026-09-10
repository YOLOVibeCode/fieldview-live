import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SquareWalletPayment } from '../SquareWalletPayment';

vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <div data-testid="square-script" data-src={src} />,
}));

const getPaymentConfig = vi.fn();
const processPurchasePayment = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getPaymentConfig: (...args: unknown[]) => getPaymentConfig(...args),
    processPurchasePayment: (...args: unknown[]) => processPurchasePayment(...args),
  },
  ApiError: class ApiError extends Error {},
}));

describe('SquareWalletPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows blocked state when relay coach location is missing', async () => {
    getPaymentConfig.mockResolvedValue({
      provider: 'relay',
      applicationId: 'relay-app',
      environment: 'sandbox',
      locationId: null,
    });

    render(
      <SquareWalletPayment
        purchaseId="purchase-1"
        amountCents={500}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-payment-config')).toBeInTheDocument();
    });

    expect(screen.getByText(/payment setup is incomplete/i)).toBeInTheDocument();
    expect(screen.queryByTestId('square-script')).not.toBeInTheDocument();
    expect(screen.queryByTestId('square-wallet-payment')).not.toBeInTheDocument();
  });

  it('loads SDK when relay coach location is present', async () => {
    getPaymentConfig.mockResolvedValue({
      provider: 'relay',
      applicationId: 'relay-app',
      environment: 'sandbox',
      locationId: 'coach-loc',
    });

    render(
      <SquareWalletPayment
        purchaseId="purchase-2"
        amountCents={500}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('square-wallet-payment')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('error-payment-config')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('square-script')).toHaveAttribute(
        'data-src',
        'https://sandbox.web.squarecdn.com/v1/square.js',
      );
    });
  });
});
