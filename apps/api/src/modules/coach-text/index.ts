/**
 * Coach text commands module: public API.
 *
 * A coach links one phone to their login in the owner portal, then texts the
 * FieldView number from it. `coachTextEngine` is what the inbound text webhook
 * calls; `phoneLinking` is what the owner portal routes call. The module sends
 * no text of its own: a reply rides back in the webhook response.
 *
 * Off unless COACH_TEXT_ENABLED is set. See docs/coach-text.md.
 */

import { prisma } from '../../lib/prisma';
import { SmsConsentRepository } from '../../repositories/implementations/SmsConsentRepository';

import { CoachTextEngine } from './CoachTextEngine';
import { EmailLinkNotifier } from './EmailLinkNotifier';
import { PhoneLinkService } from './PhoneLinkService';
import { PrismaCommandLog } from './PrismaCommandLog';
import { PrismaLinkRepository } from './PrismaLinkRepository';
import { PrismaOwnerLoginReader } from './PrismaOwnerLoginReader';
import type {
  ICoachTextCommandReader,
  ICoachTextEngine,
  IOwnerLoginReader,
  IPhoneLinkPortal,
} from './interfaces';

export * from './interfaces';
export {
  coachTextNumber,
  defaultTimeZone,
  isCoachTextEnabled,
  isCoachTextEnabledFor,
} from './config';
export { emptyTwiml, twimlMessage } from './reply/twiml';

const links = new PrismaLinkRepository(prisma);
const commandLog = new PrismaCommandLog(prisma);

const phoneLinkService = new PhoneLinkService({
  links,
  consent: new SmsConsentRepository(prisma),
  commands: commandLog,
  notifier: new EmailLinkNotifier(),
});

/** Linking, status and unlinking, for the owner portal. */
export const phoneLinking: IPhoneLinkPortal = phoneLinkService;

/** The inbound text path, for the Twilio webhook. */
export const coachTextEngine: ICoachTextEngine = new CoachTextEngine({
  linking: phoneLinkService,
  links,
  commands: commandLog,
});

/** A login's own recent texts, for the owner portal. */
export const coachTextHistory: Pick<ICoachTextCommandReader, 'listForOwnerUser'> = commandLog;

/** Finds the login behind an owner session. */
export const ownerLogins: IOwnerLoginReader = new PrismaOwnerLoginReader(prisma);
