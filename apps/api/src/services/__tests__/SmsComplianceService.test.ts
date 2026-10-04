import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SMS_PURPOSE_VIEWER_NOTIFICATIONS } from '@fieldview/data-model';

import { SmsComplianceService } from '../SmsComplianceService';

const relaySmsSend = vi.fn();

vi.mock('../../lib/sms/RelaySmsClient', () => ({
  relaySmsSend: (...args: unknown[]) => relaySmsSend(...args),
  ensureBrandPrefix: (body: string) => `FieldView.Live: ${body}`,
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    sMSMessage: { create: vi.fn().mockResolvedValue({}) },
  },
}));

describe('SmsComplianceService', () => {
  const consentReader = {
    getByPhoneAndPurpose: vi.fn(),
    hasActiveConsent: vi.fn(),
  };
  const consentWriter = {
    recordConsent: vi.fn(),
    revokeConsent: vi.fn(),
    confirmPendingConsent: vi.fn(),
    clearRevocation: vi.fn(),
  };
  const viewerReader = {
    getByPhone: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    getByEmailVerified: vi.fn(),
  };
  const viewerWriter = {
    create: vi.fn().mockResolvedValue({ id: 'viewer-1' }),
    update: vi.fn(),
    markEmailVerified: vi.fn(),
  };

  let service: SmsComplianceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SmsComplianceService(
      consentReader,
      consentWriter,
      viewerReader,
      viewerWriter,
    );
  });

  it('records opt-out when relay returns 21610', async () => {
    consentReader.hasActiveConsent.mockResolvedValue(true);
    viewerReader.getByPhone.mockResolvedValue(null);
    relaySmsSend.mockResolvedValue({ ok: false, code: 21610, message: 'blocked', optedOut: true });

    await expect(
      service.send({
        phoneE164: '+15125550100',
        body: 'hello',
        purpose: SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      }),
    ).rejects.toThrow('SMS send failed');

    expect(consentWriter.revokeConsent).toHaveBeenCalledWith('+15125550100', SMS_PURPOSE_VIEWER_NOTIFICATIONS);
  });

  it('refuses send without active consent', async () => {
    consentReader.hasActiveConsent.mockResolvedValue(false);
    viewerReader.getByPhone.mockResolvedValue(null);

    await expect(
      service.send({
        phoneE164: '+15125550100',
        body: 'hello',
        purpose: SMS_PURPOSE_VIEWER_NOTIFICATIONS,
      }),
    ).rejects.toThrow('No active SMS consent');
    expect(relaySmsSend).not.toHaveBeenCalled();
  });
});
