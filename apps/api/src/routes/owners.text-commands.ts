/**
 * Owner Text Commands Routes.
 *
 *   GET    /me/text-commands                  - is it on, and this login's phones
 *   POST   /me/text-commands/phones           - add a named phone and make its code (answered once)
 *   POST   /me/text-commands/phones/:id/code  - a new code for a phone still waiting
 *   DELETE /me/text-commands/phones/:id       - take a phone off the list
 *   PATCH  /me/text-commands                  - change the time zone
 *   GET    /me/text-commands/history          - this login's own recent texts
 *
 * The phones belong to the login, not to the account. The login comes from the
 * session token and never from the request, so one login cannot read or change
 * another's phones: their ids answer 404. Codes are answered once and never logged.
 */

import {
  AddCoachTextPhoneSchema,
  COACH_TEXT_MAX_PHONES_PER_LOGIN,
  CoachTextHistoryQuerySchema,
  UpdateCoachTextSettingsSchema,
  type AddCoachTextPhone,
  type CoachTextHistory,
  type CoachTextHistoryQuery,
  type CoachTextPhoneCode,
  type CoachTextStatus,
  type UpdateCoachTextSettings,
} from '@fieldview/data-model';
import express, { type NextFunction, type Response, type Router } from 'express';
import { z } from 'zod';

import { ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { requireOwnerAuth, type AuthRequest } from '../middleware/auth';
import { coachTextLinkRateLimit } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validation';
import {
  coachTextHistory,
  coachTextNumber,
  defaultTimeZone,
  isCoachTextEnabledFor,
  ownerLogins,
  phoneLinking,
  type CoachTextPortalStatus,
  type ICoachTextCommandReader,
  type IOwnerLoginReader,
  type IPhoneLinkPortal,
  type IssuedCode,
  type OwnerLogin,
} from '../modules/coach-text';

export interface OwnersTextCommandsRouterDeps {
  linking?: IPhoneLinkPortal;
  history?: Pick<ICoachTextCommandReader, 'listForOwnerUser'>;
  logins?: IOwnerLoginReader;
}

const PhoneIdParamsSchema = z.object({ id: z.string().uuid('Unknown phone') });

type Handler = (req: AuthRequest, res: Response) => Promise<void>;

/** Runs a handler and hands whatever it throws to the error middleware. */
function route(handler: Handler) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

function accountIdOf(req: AuthRequest): string {
  if (!req.ownerAccountId) {
    throw new UnauthorizedError('Owner account ID not found');
  }
  return req.ownerAccountId;
}

function requireTurnedOn(req: AuthRequest): void {
  if (!isCoachTextEnabledFor(accountIdOf(req))) {
    throw new ForbiddenError('Text commands are not turned on for this account');
  }
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/** The answer for an account the feature is off for. It is built without reading any store. */
function notTurnedOn(): CoachTextStatus {
  return {
    enabled: false,
    productNumber: coachTextNumber(),
    timeZone: defaultTimeZone(),
    maxPhones: COACH_TEXT_MAX_PHONES_PER_LOGIN,
    phones: [],
    commands: [],
  };
}

/** What a login may see about its own phones: masked numbers, and never a code. */
function statusView(status: CoachTextPortalStatus): CoachTextStatus {
  return {
    enabled: true,
    productNumber: coachTextNumber(),
    timeZone: status.timeZone,
    maxPhones: COACH_TEXT_MAX_PHONES_PER_LOGIN,
    phones: status.phones.map((phone) => ({
      id: phone.id,
      label: phone.label,
      phoneMasked: phone.phoneMasked,
      state: phone.state,
      codeExpiresAt: iso(phone.codeExpiresAt),
      verifiedAt: iso(phone.verifiedAt),
      lastCommandAt: iso(phone.lastCommandAt),
      unverifiedTextSeen: phone.unverifiedTextSeen,
    })),
    // The commands a coach can text arrive with the next update.
    commands: [],
  };
}

/** Answers a code once. Nothing between here and the browser may keep it. */
function sendCode(res: Response, status: number, issued: IssuedCode): void {
  const productNumber = coachTextNumber();
  const body: CoachTextPhoneCode = {
    id: issued.id,
    code: issued.code,
    codeExpiresAt: issued.codeExpiresAt.toISOString(),
    productNumber,
    smsHref: `sms:${productNumber}?&body=${encodeURIComponent(`LINK ${issued.code}`)}`,
  };
  res.set('Cache-Control', 'no-store').status(status).json(body);
}

export function createOwnersTextCommandsRouter(deps: OwnersTextCommandsRouterDeps = {}): Router {
  const linking = deps.linking ?? phoneLinking;
  const history = deps.history ?? coachTextHistory;
  const logins = deps.logins ?? ownerLogins;
  const router = express.Router();

  /**
   * The login behind the session. A token outlives a login that was removed or
   * turned off, so the login is looked up on every call.
   */
  async function loginOf(req: AuthRequest): Promise<OwnerLogin> {
    const ownerAccountId = accountIdOf(req);
    const login = req.ownerEmail ? await logins.findByEmail(req.ownerEmail) : null;
    if (!login || login.ownerAccountId !== ownerAccountId || login.status !== 'active') {
      throw new UnauthorizedError('Owner login not found');
    }
    return login;
  }

  router.get(
    '/me/text-commands',
    requireOwnerAuth,
    route(async (req, res) => {
      if (!isCoachTextEnabledFor(accountIdOf(req))) {
        res.json(notTurnedOn());
        return;
      }
      const login = await loginOf(req);
      res.json(statusView(await linking.getStatus(login.ownerUserId)));
    })
  );

  router.post(
    '/me/text-commands/phones',
    requireOwnerAuth,
    validateRequest({ body: AddCoachTextPhoneSchema }),
    coachTextLinkRateLimit,
    route(async (req, res) => {
      requireTurnedOn(req);
      const login = await loginOf(req);
      const { label, phone, timeZone } = req.body as AddCoachTextPhone;

      sendCode(res, 201, await linking.addPhone({ ownerUserId: login.ownerUserId, label, phone, timeZone }));
    })
  );

  router.post(
    '/me/text-commands/phones/:id/code',
    requireOwnerAuth,
    validateRequest({ params: PhoneIdParamsSchema }),
    coachTextLinkRateLimit,
    route(async (req, res) => {
      requireTurnedOn(req);
      const login = await loginOf(req);

      sendCode(res, 200, await linking.newCode(login.ownerUserId, String(req.params.id)));
    })
  );

  router.delete(
    '/me/text-commands/phones/:id',
    requireOwnerAuth,
    validateRequest({ params: PhoneIdParamsSchema }),
    route(async (req, res) => {
      // Not held back when the feature is off: a phone on the list can always be removed.
      const login = await loginOf(req);
      const { removed } = await linking.removePhone(login.ownerUserId, String(req.params.id));
      if (!removed) {
        throw new NotFoundError('Phone not found');
      }
      res.json({ removed });
    })
  );

  router.patch(
    '/me/text-commands',
    requireOwnerAuth,
    validateRequest({ body: UpdateCoachTextSettingsSchema }),
    route(async (req, res) => {
      requireTurnedOn(req);
      const login = await loginOf(req);
      const { timeZone } = req.body as UpdateCoachTextSettings;

      await linking.setTimeZone(login.ownerUserId, timeZone);
      res.json(statusView(await linking.getStatus(login.ownerUserId)));
    })
  );

  router.get(
    '/me/text-commands/history',
    requireOwnerAuth,
    validateRequest({ query: CoachTextHistoryQuerySchema }),
    route(async (req, res) => {
      requireTurnedOn(req);
      const login = await loginOf(req);
      const { limit } = req.query as unknown as CoachTextHistoryQuery;

      const rows = await history.listForOwnerUser(login.ownerUserId, limit);
      const body: CoachTextHistory = {
        items: rows.map((row) => ({
          createdAt: row.createdAt.toISOString(),
          body: row.body,
          status: row.status,
          replyText: row.replyText,
          phoneLabel: row.phoneLabel,
        })),
      };
      res.json(body);
    })
  );

  return router;
}
