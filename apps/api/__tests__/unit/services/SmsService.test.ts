import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmsService } from '@/services/SmsService';
import type { IGameReader } from '@/repositories/IGameRepository';
import type { IViewerIdentityReader, IViewerIdentityWriter } from '@/repositories/IViewerIdentityRepository';
import type { Game } from '@prisma/client';

// Mock Twilio
vi.mock('@/lib/twilio', () => ({
  twilioClient: {
    messages: {
      create: vi.fn(),
    },
  },
  twilioPhoneNumber: '+1234567890',
  validateTwilioRequest: vi.fn(),
}));

describe('SmsService', () => {
  let service: SmsService;
  let mockGameReader: IGameReader;
  let mockViewerIdentityReader: IViewerIdentityReader;
  let mockViewerIdentityWriter: IViewerIdentityWriter;

  beforeEach(() => {
    mockGameReader = {
      getById: vi.fn(),
      getByKeywordCode: vi.fn(),
      list: vi.fn(),
      existsKeywordCode: vi.fn(),
    };
    mockViewerIdentityReader = {
      getById: vi.fn(),
      getByEmail: vi.fn(),
      getByPhone: vi.fn(),
    };
    mockViewerIdentityWriter = {
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new SmsService(mockGameReader, mockViewerIdentityReader, mockViewerIdentityWriter);
  });

  describe('findByKeyword', () => {
    it('finds game by normalized keyword', async () => {
      const game = { id: 'game-1', keywordCode: 'ABCDEF' } as Game;
      vi.mocked(mockGameReader.getByKeywordCode).mockResolvedValue(game);

      const result = await service.findByKeyword('abcdef');

      expect(result).toEqual(game);
      expect(mockGameReader.getByKeywordCode).toHaveBeenCalledWith('ABCDEF');
    });

    it('returns null when game not found', async () => {
      vi.mocked(mockGameReader.getByKeywordCode).mockResolvedValue(null);

      const result = await service.findByKeyword('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('sendPaymentLink', () => {
    it('sends payment link SMS', async () => {
      const viewer = { id: 'viewer-1', smsOptOut: false } as any;
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue(viewer);

      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(twilioClient.messages.create).mockResolvedValue({} as any);

      await service.sendPaymentLink('game-1', '+1234567890', 'https://example.com/checkout/game-1');

      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('https://example.com/checkout/game-1'),
        from: '+1234567890',
        to: '+1234567890',
      });
    });

    it('throws error if viewer has opted out', async () => {
      const viewer = { id: 'viewer-1', smsOptOut: true } as any;
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue(viewer);

      await expect(service.sendPaymentLink('game-1', '+1234567890', 'https://example.com/checkout/game-1')).rejects.toThrow(
        'Viewer has opted out of SMS'
      );
    });
  });

  describe('handleStop', () => {
    it('creates viewer and opts out if not exists', async () => {
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue(null);
      vi.mocked(mockViewerIdentityWriter.create).mockResolvedValue({ id: 'viewer-1' } as any);
      vi.mocked(mockViewerIdentityWriter.update).mockResolvedValue({ id: 'viewer-1', smsOptOut: true } as any);

      await service.handleStop('+1234567890');

      expect(mockViewerIdentityWriter.create).toHaveBeenCalled();
      expect(mockViewerIdentityWriter.update).toHaveBeenCalledWith('viewer-1', {
        smsOptOut: true,
        optOutAt: expect.any(Date),
      });
    });

    it('updates existing viewer to opt out', async () => {
      const viewer = { id: 'viewer-1', smsOptOut: false } as any;
      vi.mocked(mockViewerIdentityReader.getByPhone).mockResolvedValue(viewer);
      vi.mocked(mockViewerIdentityWriter.update).mockResolvedValue({ ...viewer, smsOptOut: true } as any);

      await service.handleStop('+1234567890');

      expect(mockViewerIdentityWriter.update).toHaveBeenCalledWith('viewer-1', {
        smsOptOut: true,
        optOutAt: expect.any(Date),
      });
    });
  });

  describe('handleHelp', () => {
    it('sends HELP message via Twilio', async () => {
      const { twilioClient } = await import('@/lib/twilio');
      vi.mocked(twilioClient.messages.create).mockResolvedValue({} as any);

      await service.handleHelp('+1234567890');

      expect(twilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('Text a game keyword'),
        from: '+1234567890',
        to: '+1234567890',
      });
    });
  });
});
