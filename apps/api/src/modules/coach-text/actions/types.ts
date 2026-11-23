/**
 * Coach text commands: what every command gets and gives back.
 */

import type { Deadline } from '../deadline';
import type {
  CoachTextCommandStatus,
  IAttachWriter,
  ICoachTextConversationStore,
  ICoachTextLinkReader,
  IGameReader,
  ILiveLookup,
  InboundText,
  IPhoneLinkPortal,
  LiveLink,
} from '../interfaces';

/** One text, acting for one account. */
export interface CommandContext {
  text: InboundText;
  /** The text's log row. */
  commandId: string;
  /** The phone's link to the account the text acts for. */
  link: LiveLink;
  timeZone: string;
  now: Date;
  deadline: Deadline;
  /** The open question this text answers, consumed with the write. */
  pendingId: string | null;
}

export interface CommandOutcome {
  /** Null sends an empty reply. */
  reply: string | null;
  status: CoachTextCommandStatus;
  reason: string;
  action: string;
  /** The link is gone after the text (UNLINK), so it is not marked as used. */
  linkRemoved?: boolean;
}

export interface CommandDeps {
  games: IGameReader;
  lookup: ILiveLookup;
  writer: IAttachWriter;
  conversations: Pick<ICoachTextConversationStore, 'ask' | 'answer'>;
  linking: Pick<IPhoneLinkPortal, 'removePhone'>;
  links: Pick<ICoachTextLinkReader, 'findVerifiedByPhone'>;
  newId: () => string;
}
