/**
 * Twilio webhook routes (forwarded by Noctusoft relay).
 */

import {
  SMS_INBOUND_WEBHOOK_URL,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  SMS_STATUS_WEBHOOK_URL,
  SMS_STOP_KEYWORDS,
  SMS_START_KEYWORDS,
  SMS_HELP_KEYWORDS,
  SMS_YES_KEYWORD,
} from '@fieldview/data-model';
import express, { type Router, type Request, type Response, type NextFunction } from 'express';

import { BadRequestError, UnauthorizedError } from '../lib/errors';
import { normalizeInboundPhone } from '../lib/phone';
import { prisma } from '../lib/prisma';
import {
  assertRelayInboundConfigured,
  ServiceUnavailableRelay,
  verifyRelayInboundSignature,
} from '../lib/sms/verifyRelayInboundSignature';
import { smsRateLimit } from '../middleware/rateLimit';
import { GameRepository } from '../repositories/implementations/GameRepository';
import { SmsConsentRepository } from '../repositories/implementations/SmsConsentRepository';
import { ViewerIdentityRepository } from '../repositories/implementations/ViewerIdentityRepository';
import { SmsComplianceService } from '../services/SmsComplianceService';
import { SmsService } from '../services/SmsService';
const router = express.Router();

let smsServiceInstance: SmsService | null = null;

function getSmsService(): SmsService {
  if (!smsServiceInstance) {
    const gameRepo = new GameRepository(prisma);
    const viewerIdentityRepo = new ViewerIdentityRepository(prisma);
    smsServiceInstance = new SmsService(gameRepo, viewerIdentityRepo, viewerIdentityRepo);
  }
  return smsServiceInstance;
}

export function setSmsService(service: SmsService): void {
  smsServiceInstance = service;
}

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

function getRawBody(req: Request): Buffer {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  return raw ?? Buffer.from('');
}

function verifyRelay(req: Request, publicUrl: string): void {
  try {
    assertRelayInboundConfigured();
  } catch (error) {
    if (error instanceof ServiceUnavailableRelay) {
      throw error;
    }
    throw error;
  }
  const signature = req.headers['x-relay-signature'] as string | undefined;
  if (!verifyRelayInboundSignature(publicUrl, getRawBody(req), signature)) {
    throw new UnauthorizedError('Invalid relay signature');
  }
}

const urlencodedWithRaw = express.urlencoded({
  extended: false,
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  },
});

function matchesKeyword(body: string, keywords: readonly string[]): boolean {
  return keywords.includes(body.trim().toUpperCase());
}

async function handleStatusCallback(body: Record<string, string>): Promise<void> {
  const messageSid = body.MessageSid;
  const messageStatus = body.MessageStatus;
  const errorCode = body.ErrorCode;
  const from = body.From;

  if (messageSid) {
    const deliveredAt =
      messageStatus === 'delivered' || messageStatus === 'sent' ? new Date() : undefined;
    await prisma.sMSMessage.updateMany({
      where: { providerMessageId: messageSid },
      data: {
        status: messageStatus || 'unknown',
        ...(deliveredAt ? { deliveredAt } : {}),
      },
    });
  }

  if (errorCode === '21610' && from) {
    const phoneE164 = normalizeInboundPhone(from);
    const consentRepo = new SmsConsentRepository(prisma);
    const viewerRepo = new ViewerIdentityRepository(prisma);
    const compliance = new SmsComplianceService(consentRepo, consentRepo, viewerRepo, viewerRepo);
    await compliance.recordOptOut(phoneE164, SMS_PURPOSE_VIEWER_NOTIFICATIONS);
  }
}

/**
 * POST /api/webhooks/twilio/status
 */
router.post(
  '/twilio/status',
  urlencodedWithRaw,
  smsRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        verifyRelay(req, SMS_STATUS_WEBHOOK_URL);
        await handleStatusCallback(req.body as Record<string, string>);
        res.status(200).send('OK');
      } catch (error) {
        if (error instanceof ServiceUnavailableRelay) {
          return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: error.message } });
        }
        next(error);
      }
    })();
  },
);

/**
 * POST /api/webhooks/twilio
 */
router.post(
  '/twilio',
  urlencodedWithRaw,
  smsRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        verifyRelay(req, SMS_INBOUND_WEBHOOK_URL);

        const body = req.body as {
          From?: string;
          Body?: string;
          OptOutType?: string;
        };

        const { From: fromRaw, Body: messageBody, OptOutType } = body;

        if (!fromRaw) {
          throw new BadRequestError('Missing From in Twilio webhook');
        }

        const phoneE164 = normalizeInboundPhone(fromRaw);
        const smsService = getSmsService();
        const trimmedBody = (messageBody ?? '').trim();
        const keyword = trimmedBody.toUpperCase();

        const optStop = OptOutType === 'STOP' || matchesKeyword(keyword, SMS_STOP_KEYWORDS);
        const optStart = OptOutType === 'START' || matchesKeyword(keyword, SMS_START_KEYWORDS);
        const optHelp = OptOutType === 'HELP' || matchesKeyword(keyword, SMS_HELP_KEYWORDS);

        if (optStop) {
          await smsService.handleStop(phoneE164);
          return res.type('text/xml').send('<Response></Response>');
        }

        if (optStart) {
          await smsService.handleStart(phoneE164);
          return res.type('text/xml').send('<Response></Response>');
        }

        if (optHelp) {
          await smsService.handleHelp(phoneE164);
          const helpText = smsService.getHelpTwimlBody();
          return res.type('text/xml').send(`<Response><Message>${helpText}</Message></Response>`);
        }

        if (keyword === SMS_YES_KEYWORD) {
          await smsService.handleYes(phoneE164);
          return res.type('text/xml').send('<Response></Response>');
        }

        if (!trimmedBody) {
          return res.type('text/xml').send('<Response></Response>');
        }

        const game = await smsService.findByKeyword(keyword);

        if (!game) {
          return res.type('text/xml').send(
            '<Response><Message>FieldView.Live: Game not found. Please check your keyword and try again.</Message></Response>',
          );
        }

        if (game.state !== 'active' && game.state !== 'live') {
          return res.type('text/xml').send(
            '<Response><Message>FieldView.Live: This game is not currently available.</Message></Response>',
          );
        }

        await smsService.recordKeywordConsent(phoneE164);

        const paymentLink = `${APP_URL}/checkout/${game.id}`;
        await smsService.sendPaymentLink(game.id, phoneE164, paymentLink);

        await smsService.logSmsMessage({
          direction: 'inbound',
          phoneE164,
          keywordCode: keyword,
          gameId: game.id,
          messageBody: keyword,
          status: 'received',
        });

        return res.type('text/xml').send('<Response></Response>');
      } catch (error) {
        if (error instanceof ServiceUnavailableRelay) {
          return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: error.message } });
        }
        next(error);
      }
    })();
  },
);

export function createTwilioWebhookRouter(): Router {
  return router;
}
