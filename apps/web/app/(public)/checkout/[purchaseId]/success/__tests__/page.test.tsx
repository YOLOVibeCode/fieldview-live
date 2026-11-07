import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ purchaseId: 'purchase-1' }),
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { getPurchaseStatus: vi.fn() },
}));

import { apiClient } from '@/lib/api-client';

import CheckoutSuccessPage from '../page';

const getStatus = vi.mocked(apiClient.getPurchaseStatus);

beforeEach(() => {
  vi.useFakeTimers();
  push.mockReset();
  getStatus.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('CheckoutSuccessPage', () => {
  it('sends a paid viewer to the stream with their access token', async () => {
    getStatus.mockResolvedValue({
      purchaseId: 'purchase-1',
      status: 'paid',
      entitlementToken: 'tok-1',
      watchUrl: 'https://fieldview.live/direct/tchs?access=tok-1',
    } as never);
    render(<CheckoutSuccessPage />);
    await flush();

    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-watch-stream'));
    expect(push).toHaveBeenCalledWith('/direct/tchs?access=tok-1');
  });

  it('says the payment failed instead of showing success', async () => {
    getStatus.mockResolvedValue({ purchaseId: 'purchase-1', status: 'failed' } as never);
    render(<CheckoutSuccessPage />);
    await flush();

    expect(screen.getByTestId('checkout-failed')).toBeInTheDocument();
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
  });

  it('stops waiting after two minutes and points the viewer to their email', async () => {
    getStatus.mockResolvedValue({ purchaseId: 'purchase-1', status: 'created' } as never);
    render(<CheckoutSuccessPage />);
    await flush();
    expect(screen.getByText('Processing Payment...')).toBeInTheDocument();

    await flush(2 * 60 * 1000 + 2_000);

    expect(screen.getByTestId('checkout-pending-timeout')).toBeInTheDocument();
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    const callsAtTimeout = getStatus.mock.calls.length;
    await flush(10_000);
    expect(getStatus.mock.calls.length).toBe(callsAtTimeout);
  });
});
