import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiRequest = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { SmsOptInPageForm } from '@/components/SmsOptInPageForm';

describe('SmsOptInPageForm (public /sms page)', () => {
  beforeEach(() => apiRequest.mockReset());

  it('shows the product consent box unchecked, with the full disclosure', () => {
    render(<SmsOptInPageForm />);
    const box = screen.getByTestId('checkbox-sms-opt-in') as HTMLInputElement;
    expect(box.checked).toBe(false);
    const text = screen.getByTestId('form-sms-opt-in').textContent || '';
    expect(text).toContain('Text me game alerts, score updates, and payment links from FieldView.Live.');
    expect(text).toContain('Message frequency varies. Message and data rates may apply.');
    expect(text).toContain('Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.');
  });

  it('does not submit until the person checks the box', async () => {
    render(<SmsOptInPageForm />);
    fireEvent.change(screen.getByTestId('input-sms-phone'), { target: { value: '8175550123' } });
    fireEvent.click(screen.getByTestId('btn-sms-opt-in'));
    expect(await screen.findByTestId('sms-opt-in-error')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('posts phone and consent once the box is checked, then confirms', async () => {
    apiRequest.mockResolvedValue({ ok: true });
    render(<SmsOptInPageForm />);
    fireEvent.change(screen.getByTestId('input-sms-phone'), { target: { value: '8175550123' } });
    fireEvent.click(screen.getByTestId('checkbox-sms-opt-in'));
    fireEvent.click(screen.getByTestId('btn-sms-opt-in'));
    await waitFor(() => expect(screen.getByTestId('sms-opt-in-done')).toBeTruthy());
    const [endpoint, init] = apiRequest.mock.calls[0];
    expect(endpoint).toBe('/api/public/sms/opt-in');
    expect(JSON.parse(init.body)).toMatchObject({ phone: '8175550123', consent: true });
  });
});
