import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SmsService } from '@/services/SmsService';
import { SmsComplianceService } from '@/services/SmsComplianceService';

describe('SmsService', () => {
  const mockGameReader = { getByKeywordCode: vi.fn() };
  const mockViewerReader = { getByPhone: vi.fn() };
  const mockViewerWriter = { create: vi.fn(), update: vi.fn() };
  const mockCompliance = {
    send: vi.fn(),
    recordOptOut: vi.fn(),
    logInbound: vi.fn(),
    recordViewerConsent: vi.fn(),
    recordOptInFromStart: vi.fn(),
    confirmYesReply: vi.fn(),
  };

  let service: SmsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SmsService(
      mockGameReader,
      mockViewerReader,
      mockViewerWriter,
      mockCompliance as unknown as SmsComplianceService,
    );
  });

  it('sendPaymentLink delegates to compliance service', async () => {
    mockCompliance.send.mockResolvedValue(undefined);
    await service.sendPaymentLink('game-1', '+15125550100', 'https://pay');
    expect(mockCompliance.send).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneE164: '+15125550100',
        gameId: 'game-1',
      }),
    );
  });

  it('handleStop records opt-out', async () => {
    await service.handleStop('+15125550100');
    expect(mockCompliance.recordOptOut).toHaveBeenCalledWith('+15125550100');
  });
});
