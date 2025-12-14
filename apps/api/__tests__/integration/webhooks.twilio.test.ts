import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type SuperTest, agent } from 'supertest';
import app from '@/server';
import { SmsService } from '@/services/SmsService';
import { validateTwilioRequest } from '@/lib/twilio';
import * as twilioWebhookRoute from '@/routes/webhooks.twilio';
import type { Game } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock Twilio validation
vi.mock('@/lib/twilio', () => ({
  twilioClient: {
    messages: {
      create: vi.fn(),
    },
  },
  twilioPhoneNumber: '+1234567890',
  validateTwilioRequest: vi.fn(),
}));

describe('Twilio Webhook Routes', () => {
  let request: SuperTest<typeof app>;
  let mockSmsService: {
    findByKeyword: ReturnType<typeof vi.fn>;
    sendPaymentLink: ReturnType<typeof vi.fn>;
    handleStop: ReturnType<typeof vi.fn>;
    handleHelp: ReturnType<typeof vi.fn>;
    logSmsMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = agent(app);

    mockSmsService = {
      findByKeyword: vi.fn(),
      sendPaymentLink: vi.fn(),
      handleStop: vi.fn(),
      handleHelp: vi.fn(),
      logSmsMessage: vi.fn(),
    };

    // Set the mocked service
    twilioWebhookRoute.setSmsService(mockSmsService as any);

    // Mock Twilio signature validation (default to true)
    vi.mocked(validateTwilioRequest).mockReturnValue(true);
  });

  describe('POST /api/webhooks/twilio', () => {
    it('routes keyword to game and sends payment link', async () => {
      const game = {
        id: 'game-1',
        keywordCode: 'ABCDEF',
        state: 'active',
      } as Game;

      mockSmsService.findByKeyword.mockResolvedValue(game);
      mockSmsService.sendPaymentLink.mockResolvedValue(undefined);
      mockSmsService.logSmsMessage.mockResolvedValue(undefined);

      const response = await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: 'ABCDEF',
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/xml');
      expect(mockSmsService.findByKeyword).toHaveBeenCalledWith('ABCDEF');
      expect(mockSmsService.sendPaymentLink).toHaveBeenCalled();
    });

    it('handles STOP command', async () => {
      mockSmsService.handleStop.mockResolvedValue(undefined);

      const response = await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: 'STOP',
        })
        .expect(200);

      expect(response.text).toContain('unsubscribed');
      expect(mockSmsService.handleStop).toHaveBeenCalledWith('+1234567890');
    });

    it('handles HELP command', async () => {
      mockSmsService.handleHelp.mockResolvedValue(undefined);

      const response = await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: 'HELP',
        })
        .expect(200);

      expect(mockSmsService.handleHelp).toHaveBeenCalledWith('+1234567890');
    });

    it('returns 401 if Twilio signature invalid', async () => {
      vi.mocked(validateTwilioRequest).mockReturnValue(false);

      await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'invalid-signature')
        .send({
          From: '+1234567890',
          Body: 'ABCDEF',
        })
        .expect(401);
    });

    it('returns 400 if From or Body missing', async () => {
      await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          // Body missing
        })
        .expect(400);
    });

    it('returns error message if game not found', async () => {
      mockSmsService.findByKeyword.mockResolvedValue(null);

      const response = await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: 'INVALID',
        })
        .expect(200);

      expect(response.text).toContain('Game not found');
    });

    it('returns error if game not active', async () => {
      const game = {
        id: 'game-1',
        keywordCode: 'ABCDEF',
        state: 'draft',
      } as Game;

      mockSmsService.findByKeyword.mockResolvedValue(game);

      const response = await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: 'ABCDEF',
        })
        .expect(200);

      expect(response.text).toContain('not currently available');
    });

    it('normalizes keyword (lowercase, whitespace)', async () => {
      const game = {
        id: 'game-1',
        keywordCode: 'ABCDEF',
        state: 'active',
      } as Game;

      mockSmsService.findByKeyword.mockResolvedValue(game);
      mockSmsService.sendPaymentLink.mockResolvedValue(undefined);
      mockSmsService.logSmsMessage.mockResolvedValue(undefined);

      await request
        .post('/api/webhooks/twilio')
        .set('x-twilio-signature', 'valid-signature')
        .send({
          From: '+1234567890',
          Body: '  abcdef  ', // Lowercase with whitespace
        })
        .expect(200);

      expect(mockSmsService.findByKeyword).toHaveBeenCalledWith('ABCDEF');
    });
  });
});
