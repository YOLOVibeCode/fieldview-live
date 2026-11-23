/**
 * Coach text commands module: public API.
 *
 * A coach lists phones in the owner portal, their own and their helpers', and
 * each texts the FieldView number for that account: LIVE, GAMES, ATTACH, UNDO,
 * UNLINK, MENU. One phone may work with several accounts and texts ACCOUNT to
 * choose. `coachTextEngine` is what the
 * inbound text webhook calls; `phoneLinking` is what the owner portal routes
 * call. The module sends no text of its own: a reply rides back in the webhook
 * response.
 *
 * Off unless COACH_TEXT_ENABLED is set. See docs/coach-text.md.
 */

import { prisma } from '../../lib/prisma';
import { GameRepository } from '../../repositories/implementations/GameRepository';
import { SmsConsentRepository } from '../../repositories/implementations/SmsConsentRepository';
import { liveStreamFinder } from '../camera-sources';

import { AccountChooser } from './AccountChooser';
import { CoachTextEngine } from './CoachTextEngine';
import { EmailLinkNotifier } from './EmailLinkNotifier';
import { LiveLookup } from './LiveLookup';
import { PhoneLinkService } from './PhoneLinkService';
import { PrismaAttachWriter } from './PrismaAttachWriter';
import { PrismaCommandLog } from './PrismaCommandLog';
import { PrismaConversationStore } from './PrismaConversationStore';
import { PrismaLinkRepository } from './PrismaLinkRepository';
import { PrismaOwnerLoginReader } from './PrismaOwnerLoginReader';
import { PrismaSettingsStore } from './PrismaSettingsStore';
import type {
  IAccountChooser,
  ICoachTextCommandReader,
  ICoachTextEngine,
  IKeywordLookup,
  IOwnerLoginReader,
  IPhoneLinkPortal,
} from './interfaces';
import { PrismaGameReader } from './resolve/PrismaGameReader';

export * from './interfaces';
export {
  coachTextNumber,
  defaultTimeZone,
  isCoachTextEnabled,
  isCoachTextEnabledFor,
} from './config';
export { emptyTwiml, twimlMessage } from './reply/twiml';
export { COACH_TEXT_COMMANDS } from './commandList';

const links = new PrismaLinkRepository(prisma);
const commandLog = new PrismaCommandLog(prisma);
const conversations = new PrismaConversationStore(prisma);
const settings = new PrismaSettingsStore(prisma);
const consent = new SmsConsentRepository(prisma);

/**
 * A word is a viewer keyword when a game has it. The repository is made on first
 * use, as some tests replace it with a mock defined after this module loads.
 */
let gameRepository: GameRepository | null = null;
const keywords: IKeywordLookup = {
  isKeyword: async (word: string): Promise<boolean> => {
    gameRepository ??= new GameRepository(prisma);
    return (await gameRepository.getByKeywordCode(word)) !== null;
  },
};

const phoneLinkService = new PhoneLinkService({
  links,
  consent,
  commands: commandLog,
  notifier: new EmailLinkNotifier(),
  settings,
});

/** The phone list, its codes and its status, for the owner portal. */
export const phoneLinking: IPhoneLinkPortal = phoneLinkService;

/** Which account a text from a phone is for. Every command starts here. */
export const accountChooser: IAccountChooser = new AccountChooser({ links, conversations });

/** The inbound text path, for the Twilio webhook. */
export const coachTextEngine: ICoachTextEngine = new CoachTextEngine({
  linking: phoneLinkService,
  links,
  commands: commandLog,
  chooser: accountChooser,
  conversations,
  settings,
  consent,
  keywords,
  games: new PrismaGameReader(prisma),
  lookup: new LiveLookup({ finder: liveStreamFinder }),
  writer: new PrismaAttachWriter(prisma),
});

/** A login's own recent texts, for the owner portal. */
export const coachTextHistory: Pick<ICoachTextCommandReader, 'listForOwnerUser'> = commandLog;

/** Finds the login behind an owner session. */
export const ownerLogins: IOwnerLoginReader = new PrismaOwnerLoginReader(prisma);
