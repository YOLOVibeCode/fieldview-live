import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationService } from '@/services/NotificationService';
import { SmsComplianceService } from '@/services/SmsComplianceService';

vi.mock('@/lib/email', () => ({
  getEmailProvider: () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('NotificationService', () => {
  const viewerReader = { getByPhone: vi.fn() };
  const smsCompliance = { send: vi.fn() };

  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService(viewerReader, smsCompliance as unknown as SmsComplianceService);
  });

  it('sendSms uses compliance guard', async () => {
    smsCompliance.send.mockResolvedValue(undefined);
    await service.sendSms('+15125550100', 'Stream is live');
    expect(smsCompliance.send).toHaveBeenCalled();
  });
});
