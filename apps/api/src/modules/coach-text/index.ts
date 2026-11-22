/**
 * Coach text commands module: public API.
 *
 * A coach lists phones in the owner portal, their own and their helpers', and
 * each texts the FieldView number for that account. One phone may work with
 * several accounts and texts ACCOUNT to choose. `coachTextEngine` is what the
 * inbound text webhook calls; `phoneLinking` is what the owner portal routes
 * call. The module sends no text of its own: a reply rides back in the webhook
 * response.
 *
 * Off unless COACH_TEXT_ENABLED is set. See docs/coach-text.md.
 */

import { prisma } from '../../lib/prisma';
import { SmsConsentRepository } from '../../repositories/implementations/SmsConsentRepository';

import { AccountChooser } from './AccountChooser';
import { CoachTextEngine } from './CoachTextEngine';
import { EmailLinkNotifier } from './EmailLinkNotifier';
import { PhoneLinkService } from './PhoneLinkService';
import { PrismaCommandLog } from './PrismaCommandLog';
import { PrismaConversationStore } from './PrismaConversationStore';
import { PrismaLinkRepository } from './PrismaLinkRepository';
import { PrismaOwnerLoginReader } from './PrismaOwnerLoginReader';
import { PrismaSettingsStore } from './PrismaSettingsStore';
import type {
  IAccountChooser,
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
const conversations = new PrismaConversationStore(prisma);
const settings = new PrismaSettingsStore(prisma);

const phoneLinkService = new PhoneLinkService({
  links,
  consent: new SmsConsentRepository(prisma),
  commands: commandLog,
  notifier: new EmailLinkNotifier(),
  settings,
});

/** The phone list, its codes and its status, for the owner portal. */
export const phoneLinking: IPhoneLinkPortal = phoneLinkService;

/** Which account a text from a phone is for. Commands (next update) start here. */
export const accountChooser: IAccountChooser = new AccountChooser({ links, conversations });

/** The inbound text path, for the Twilio webhook. */
export const coachTextEngine: ICoachTextEngine = new CoachTextEngine({
  linking: phoneLinkService,
  links,
  commands: commandLog,
  chooser: accountChooser,
  conversations,
  settings,
});

/** A login's own recent texts, for the owner portal. */
export const coachTextHistory: Pick<ICoachTextCommandReader, 'listForOwnerUser'> = commandLog;

/** Finds the login behind an owner session. */
export const ownerLogins: IOwnerLoginReader = new PrismaOwnerLoginReader(prisma);
