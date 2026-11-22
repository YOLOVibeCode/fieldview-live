/**
 * Owner Text Commands Routes.
 *
 *   GET    /me/text-commands          - is it on, and how this login's phone link stands
 *   POST   /me/text-commands/link     - make a link code for a phone (answered once)
 *   DELETE /me/text-commands/link     - unlink the phone, or drop a code that is waiting
 *   PATCH  /me/text-commands          - change the time zone
 *   GET    /me/text-commands/history  - this login's own recent texts
 *
 * A link belongs to one login, not to the account. The login comes from the session
 * token and never from the request, so one login cannot read or change another's link.
 * The code is answered once and is never logged.
 */

import {
  CoachTextHistoryQuerySchema,
  StartCoachTextLinkSchema,
  UpdateCoachTextSettingsSchema,
  type CoachTextHistory,
  type CoachTextHistoryQuery,
  type CoachTextLinkStarted,
  type CoachTextStatus,
  type StartCoachTextLink,
  type UpdateCoachTextSettings,
} from '@fieldview/data-model';
import express, { type NextFunction, type Response, type Router } from 'express';

import { ForbiddenError, UnauthorizedError } from '../lib/errors';
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
  type CoachTextLinkStatus,
  type ICoachTextCommandReader,
  type IOwnerLoginReader,
  type IPhoneLinkPortal,
  type OwnerLogin,
} from '../modules/coach-text';

export interface OwnersTextCommandsRouterDeps {
  linking?: IPhoneLinkPortal;
  history?: Pick<ICoachTextCommandReader, 'listForOwnerUser'>;
  logins?: IOwnerLoginReader;
}

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
    state: 'none',
    productNumber: coachTextNumber(),
    phoneMasked: null,
    pendingPhoneMasked: null,
    codeExpiresAt: null,
    unverifiedTextSeen: false,
    verifiedAt: null,
    lastCommandAt: null,
    timeZone: defaultTimeZone(),
    commands: [],
  };
}

/** What a login may see about its own link: masked numbers, and never a code. */
function statusView(status: CoachTextLinkStatus): CoachTextStatus {
  return {
    enabled: true,
    state: status.state,
    productNumber: coachTextNumber(),
    phoneMasked: status.phoneMasked,
    pendingPhoneMasked: status.pendingPhoneMasked,
    codeExpiresAt: iso(status.codeExpiresAt),
    unverifiedTextSeen: status.unverifiedTextSeen,
    verifiedAt: iso(status.verifiedAt),
    lastCommandAt: iso(status.lastCommandAt),
    timeZone: status.timeZone,
    // The commands a coach can text arrive with the next update.
    commands: [],
  };
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
    '/me/text-commands/link',
    requireOwnerAuth,
    validateRequest({ body: StartCoachTextLinkSchema }),
    coachTextLinkRateLimit,
    route(async (req, res) => {
      requireTurnedOn(req);
      const login = await loginOf(req);
      const { phone, timeZone } = req.body as StartCoachTextLink;

      const started = await linking.startLink({ ownerUserId: login.ownerUserId, phone, timeZone });
      const productNumber = coachTextNumber();
      const body: CoachTextLinkStarted = {
        code: started.code,
        codeExpiresAt: started.codeExpiresAt.toISOString(),
        productNumber,
        smsHref: `sms:${productNumber}?&body=${encodeURIComponent(`LINK ${started.code}`)}`,
      };

      // The code is answered once. Nothing between here and the browser may keep it.
      res.set('Cache-Control', 'no-store').status(201).json(body);
    })
  );

  router.delete(
    '/me/text-commands/link',
    requireOwnerAuth,
    route(async (req, res) => {
      // Not held back when the feature is off: a phone that was linked can always be unlinked.
      const login = await loginOf(req);
      const { unlinked } = await linking.unlink(login.ownerUserId);
      res.json({ unlinked });
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
        })),
      };
      res.json(body);
    })
  );

  return router;
}
