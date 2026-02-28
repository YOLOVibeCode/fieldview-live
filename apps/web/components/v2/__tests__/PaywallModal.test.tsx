/**
 * PaywallModal Component Tests
 *
 * Tests price display, step transitions, demo mode, onSuccess, onClose.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaywallModal } from '../paywall/PaywallModal';

describe('PaywallModal', () => {
  const defaultProps = {
    slug: 'test-stream',
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    priceInCents: 999,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    defaultProps.onClose.mockClear();
    defaultProps.onSuccess.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(<PaywallModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('paywall-modal-v2')).not.toBeInTheDocument();
  });

  it('should render price and custom message when open', () => {
    render(
      <PaywallModal
        {...defaultProps}
        paywallMessage="Premium stream - unlock to watch"
      />,
    );
    expect(screen.getByTestId('paywall-modal-v2')).toBeInTheDocument();
    expect(screen.getByText(/\$9\.99/)).toBeInTheDocument();
    expect(screen.getByTestId('paywall-custom-message')).toHaveTextContent(/Premium stream/);
  });

  it('should show info form (step 1) by default', () => {
    render(<PaywallModal {...defaultProps} />);
    expect(screen.getByTestId('form-paywall-info')).toBeInTheDocument();
    expect(screen.getByTestId('input-paywall-email')).toBeInTheDocument();
    expect(screen.getByTestId('btn-continue-to-payment')).toBeInTheDocument();
  });

  it('should transition to payment step when info form submitted', () => {
    render(<PaywallModal {...defaultProps} />);
    fireEvent.change(screen.getByTestId('input-paywall-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('input-paywall-first-name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByTestId('input-paywall-last-name'), { target: { value: 'Doe' } });
    fireEvent.submit(screen.getByTestId('form-paywall-info'));
    expect(screen.getByTestId('form-paywall-payment')).toBeInTheDocument();
    expect(screen.getByTestId('btn-back-to-info')).toBeInTheDocument();
  });

  it('should show demo badge and bypass button when demoMode is true', () => {
    render(
      <PaywallModal {...defaultProps} demoMode onDemoBypass={vi.fn()} />,
    );
    expect(screen.getByTestId('demo-mode-badge')).toBeInTheDocument();
    expect(screen.getByTestId('btn-demo-bypass')).toBeInTheDocument();
  });

  it('should call onDemoBypass when demo bypass button clicked', () => {
    const onDemoBypass = vi.fn();
    render(<PaywallModal {...defaultProps} demoMode onDemoBypass={onDemoBypass} />);
    fireEvent.click(screen.getByTestId('btn-demo-bypass'));
    expect(onDemoBypass).toHaveBeenCalledTimes(1);
  });

  it('should show error when required fields missing on info submit', () => {
    render(<PaywallModal {...defaultProps} />);
    fireEvent.submit(screen.getByTestId('form-paywall-info'));
    expect(screen.getByTestId('error-paywall')).toHaveTextContent(/fill in all fields/i);
  });
});
