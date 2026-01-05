import { describe, it, expect } from 'vitest';

import type { EmailOptions, IEmailProvider } from '../../../src/lib/email/IEmailProvider';
import { ReceiptService } from '../../../src/services/ReceiptService';

class FakeEmailProvider implements IEmailProvider {
  public sent: EmailOptions[] = [];

  async sendEmail(options: EmailOptions): Promise<void> {
    this.sent.push(options);
  }
}

describe('ReceiptService', () => {
  it('sends a receipt email with watch link when streamUrl is provided', async () => {
    const provider = new FakeEmailProvider();
    const svc = new ReceiptService(provider, 'http://localhost:4300');

    await svc.sendPurchaseReceipt({
      to: 'viewer@test.fieldview.live',
      purchaseId: 'p1',
      amountCents: 500,
      currency: 'USD',
      streamUrl: 'http://localhost:4300/stream/t1',
    });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]?.to).toBe('viewer@test.fieldview.live');
    expect(provider.sent[0]?.subject).toContain('receipt');
    expect(provider.sent[0]?.text).toContain('Purchase ID: p1');
    expect(provider.sent[0]?.text).toContain('Watch: http://localhost:4300/stream/t1');
  });

  it('falls back to checkout success link when streamUrl is null', async () => {
    const provider = new FakeEmailProvider();
    const svc = new ReceiptService(provider, 'http://localhost:4300');

    await svc.sendPurchaseReceipt({
      to: 'viewer@test.fieldview.live',
      purchaseId: 'p2',
      amountCents: 1200,
      currency: 'USD',
      streamUrl: null,
    });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]?.text).toContain('Watch: http://localhost:4300/checkout/p2/success');
  });
});


