/**
 * Twilio Webhook Routes
 * 
 * Handles inbound SMS from Twilio.
 * Following CDD: Contract matches OpenAPI spec.
 */

import express, { type Router } from 'express';

import { BadRequestError, UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { validateTwilioRequest } from '../lib/twilio';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { SmsService } from '../services/SmsService';
import { smsRateLimit } from '../middleware/rateLimit';

const router = express.Router();

// Lazy initialization
let smsServiceInstance: SmsService | null = null;

function getSmsService(): SmsService {
  if (!smsServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    smsServiceInstance = new SmsService(gameRepo, viewerIdentityRepo, viewerIdentityRepo);
  }
  return smsServiceInstance;
}

// Export for testing
export function setSmsService(service: SmsService): void {
  smsServiceInstance = service;
}

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

/**
 * POST /api/webhooks/twilio
 * 
 * Handle inbound SMS from Twilio.
 */
router.post(
  '/twilio',
  express.urlencoded({ extended: true }),
  smsRateLimit,
  (req, res, next) => {
    void (async () => {
      try {
        // Verify Twilio signature
        const signature = req.headers['x-twilio-signature'] as string | undefined;
        const authToken = process.env.TWILIO_AUTH_TOKEN || '';

        // Build full URL for signature validation
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const isValid = validateTwilioRequest(authToken, signature, fullUrl, req.body as Record<string, string>);

        if (!isValid) {
          throw new UnauthorizedError('Invalid Twilio signature');
        }

        const { From: phoneE164, Body: messageBody } = req.body as { From?: string; Body?: string };

        if (!phoneE164 || !messageBody) {
          throw new BadRequestError('Missing From or Body in Twilio webhook');
        }

        const smsService = getSmsService();

        // Normalize keyword (uppercase, trim)
        const keyword = messageBody.trim().toUpperCase();

        // Handle STOP
        if (keyword === 'STOP') {
          await smsService.handleStop(phoneE164);
          return res.type('text/xml').send(
            '<Response><Message>You have been unsubscribed. Reply HELP for assistance.</Message></Response>'
          );
        }

        // Handle HELP
        if (keyword === 'HELP') {
          await smsService.handleHelp(phoneE164);
          return res.type('text/xml').send('<Response></Response>'); // Twilio already sent message
        }

        // Lookup game by keyword
        const game = await smsService.findByKeyword(keyword);

        if (!game) {
          // Keyword not found
          return res.type('text/xml').send(
            '<Response><Message>Game not found. Please check your keyword and try again.</Message></Response>'
          );
        }

        // Check if game is active
        if (game.state !== 'active' && game.state !== 'live') {
          return res.type('text/xml').send(
            '<Response><Message>This game is not currently available.</Message></Response>'
          );
        }

        // Generate payment link
        const paymentLink = `${APP_URL}/checkout/${game.id}`;

        // Send payment link SMS
        await smsService.sendPaymentLink(game.id, phoneE164, paymentLink);

        // Log inbound SMS
        await smsService.logSmsMessage({
          direction: 'inbound',
          phoneE164,
          keywordCode: keyword,
          gameId: game.id,
          messageBody: keyword,
          status: 'received',
        });

        // Respond to Twilio (message already sent)
        return res.type('text/xml').send('<Response></Response>');
      } catch (error) {
        next(error);
      }
    })();
  }
);

export function createTwilioWebhookRouter(): Router {
  return router;
}
