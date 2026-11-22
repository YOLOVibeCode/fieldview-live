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
import { logger } from '../lib/logger';
import { maskPhoneE164, normalizeInboundPhone } from '../lib/phone';
import { prisma } from '../lib/prisma';
import {
  assertRelayInboundConfigured,
  ServiceUnavailableRelay,
  verifyRelayInboundSignature,
} from '../lib/sms/verifyRelayInboundSignature';
import { smsRateLimit } from '../middleware/rateLimit';
import {
  coachTextEngine,
  isCoachTextEnabled,
  twimlMessage,
  type CoachTextResult,
  type ICoachTextEngine,
  type InboundText,
} from '../modules/coach-text';
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

let coachTextEngineOverride: ICoachTextEngine | null = null;

function getCoachTextEngine(): ICoachTextEngine {
  return coachTextEngineOverride ?? coachTextEngine;
}

/** Test seam: swaps the coach text engine. Pass null to go back to the real one. */
export function setCoachTextEngine(engine: ICoachTextEngine | null): void {
  coachTextEngineOverride = engine;
}

const APP_URL = process.env.APP_URL || 'https://fieldview.live';

function getRawBody(req: Request): Buffer {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  return raw ?? Buffer.from('');
}

const urlencodedWithRaw = express.urlencoded({
  extended: false,
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  },
});

/**
 * Checks the relay's signature. It runs before the rate limit, so a post that
 * nobody signed is refused without using up a real sender's texts.
 */
function requireRelaySignature(publicUrl: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      assertRelayInboundConfigured();
    } catch (error) {
      if (error instanceof ServiceUnavailableRelay) {
        res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: error.message } });
        return;
      }
      next(error);
      return;
    }
    const signature = req.headers['x-relay-signature'] as string | undefined;
    if (!verifyRelayInboundSignature(publicUrl, getRawBody(req), signature)) {
      next(new UnauthorizedError('Invalid relay signature'));
      return;
    }
    next();
  };
}

/**
 * Asks the coach text engine about a text. Anything that goes wrong sends the
 * text down the viewer path, as if the engine were not there.
 */
async function askCoachText(text: InboundText): Promise<CoachTextResult> {
  try {
    return await getCoachTextEngine().handleInbound(text);
  } catch (error) {
    logger.warn(
      { error, phone: maskPhoneE164(text.from) },
      'Coach text engine failed; the text goes to the viewer path'
    );
    return { handled: false };
  }
}

/** STOP also pauses a coach's linked phone. A failure never changes the STOP answer. */
async function tellCoachTextOfStop(from: string, twilioVerified: boolean): Promise<void> {
  try {
    await getCoachTextEngine().handleOptOut({ from, twilioVerified });
  } catch (error) {
    logger.warn({ error, phone: maskPhoneE164(from) }, 'Coach text pause on STOP failed');
  }
}

/** START turns a paused phone back on. A failure never changes the START answer. */
async function tellCoachTextOfStart(from: string, twilioVerified: boolean): Promise<void> {
  try {
    await getCoachTextEngine().handleOptIn({ from, twilioVerified });
  } catch (error) {
    logger.warn({ error, phone: maskPhoneE164(from) }, 'Coach text resume on START failed');
  }
}

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
  requireRelaySignature(SMS_STATUS_WEBHOOK_URL),
  smsRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        await handleStatusCallback(req.body as Record<string, string>);
        res.status(200).send('OK');
      } catch (error) {
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
  requireRelaySignature(SMS_INBOUND_WEBHOOK_URL),
  smsRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const receivedAtMs = Date.now();

        const body = req.body as {
          From?: string;
          Body?: string;
          OptOutType?: string;
          MessageSid?: unknown;
        };

        const { From: fromRaw, Body: messageBody, OptOutType } = body;

        if (!fromRaw) {
          throw new BadRequestError('Missing From in Twilio webhook');
        }

        const phoneE164 = normalizeInboundPhone(fromRaw);
        const smsService = getSmsService();
        const trimmedBody = (messageBody ?? '').trim();
        const keyword = trimmedBody.toUpperCase();

        // Coach text commands act only on a text the relay says Twilio signed.
        const coachTextOn = isCoachTextEnabled();
        const twilioVerified = req.headers['x-relay-twilio-verified'] === '1';
        const messageSid =
          typeof body.MessageSid === 'string' && body.MessageSid.trim()
            ? body.MessageSid.trim()
            : null;

        const optStop = OptOutType === 'STOP' || matchesKeyword(keyword, SMS_STOP_KEYWORDS);
        const optStart = OptOutType === 'START' || matchesKeyword(keyword, SMS_START_KEYWORDS);
        const optHelp = OptOutType === 'HELP' || matchesKeyword(keyword, SMS_HELP_KEYWORDS);

        if (optStop) {
          await smsService.handleStop(phoneE164);
          if (coachTextOn) {
            await tellCoachTextOfStop(phoneE164, twilioVerified);
          }
          return res.type('text/xml').send('<Response></Response>');
        }

        if (optStart) {
          await smsService.handleStart(phoneE164);
          if (coachTextOn) {
            await tellCoachTextOfStart(phoneE164, twilioVerified);
          }
          return res.type('text/xml').send('<Response></Response>');
        }

        if (optHelp) {
          await smsService.handleHelp(phoneE164);
          // The help text has an ampersand in it, so it goes through the escaping builder.
          return res.type('text/xml').send(twimlMessage(smsService.getHelpTwimlBody()));
        }

        if (keyword === SMS_YES_KEYWORD) {
          await smsService.handleYes(phoneE164);
          return res.type('text/xml').send('<Response></Response>');
        }

        if (!trimmedBody) {
          return res.type('text/xml').send('<Response></Response>');
        }

        if (coachTextOn) {
          const coach = await askCoachText({
            from: phoneE164,
            body: trimmedBody,
            messageSid,
            twilioVerified,
            receivedAtMs,
          });
          if (coach.handled) {
            return res.type('text/xml').send(coach.twiml);
          }
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
        next(error);
      }
    })();
  },
);

export function createTwilioWebhookRouter(): Router {
  return router;
}
