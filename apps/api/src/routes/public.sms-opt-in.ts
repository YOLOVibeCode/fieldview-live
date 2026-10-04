/**
 * Public SMS opt-in from the /sms page (POST /api/public/sms/opt-in).
 *
 * Records consent only; it never sends a text. The person must check the box
 * (consent: true); a phone number alone is not consent. A hidden honeypot
 * field drops bots without saying so.
 */

import express, { type Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';

import { BadRequestError } from '../lib/errors';
import { parsePhoneToE164 } from '../lib/phone';
import { getSmsComplianceFromRequest, requestClientMeta } from '../lib/sms/consentFromRequest';

export const SMS_OPT_IN_PAGE_SOURCE = 'web:/sms';

const OptInSchema = z.object({
  phone: z.string(),
  consent: z.unknown(),
  website: z.string().optional(),
});

export function createPublicSmsOptInRouter(): Router {
  const router = express.Router();

  router.post('/sms/opt-in', (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const parsed = OptInSchema.safeParse(req.body);
        if (!parsed.success) throw new BadRequestError('Enter a valid mobile number.');
        const body = parsed.data;

        if (body.website && body.website.trim() !== '') {
          res.json({ ok: true });
          return;
        }
        if (body.consent !== true) {
          throw new BadRequestError('Check the box to agree to text messages.');
        }
        const phoneE164 = parsePhoneToE164(body.phone);

        await getSmsComplianceFromRequest().recordViewerConsent({
          phoneE164,
          source: SMS_OPT_IN_PAGE_SOURCE,
          ...requestClientMeta(req),
        });
        res.json({ ok: true });
      } catch (error) {
        next(error);
      }
    })();
  });

  return router;
}
