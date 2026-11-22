/**
 * Coach text commands: which account a text is for.
 *
 * A phone may work with several accounts. With one live account there is
 * nothing to choose. With more, the phone's choice is used while it lasts;
 * otherwise the bot has to ask. The choice is checked against the live links on
 * every text, so a removed, paused or disallowed link never keeps it alive.
 */

import { COACH_TEXT_MAX_ACCOUNTS_PER_PHONE } from '@fieldview/data-model';

import type {
  AccountResolution,
  IAccountChooser,
  ICoachTextConversationStore,
  ICoachTextLinkReader,
  LiveLink,
} from './interfaces';
import { isLive } from './rules';

export interface AccountChooserDeps {
  links: Pick<ICoachTextLinkReader, 'findVerifiedByPhone'>;
  conversations: Pick<ICoachTextConversationStore, 'get'>;
  now?: () => Date;
}

export class AccountChooser implements IAccountChooser {
  private readonly links: Pick<ICoachTextLinkReader, 'findVerifiedByPhone'>;
  private readonly conversations: Pick<ICoachTextConversationStore, 'get'>;
  private readonly now: () => Date;

  constructor(deps: AccountChooserDeps) {
    this.links = deps.links;
    this.conversations = deps.conversations;
    this.now = deps.now ?? ((): Date => new Date());
  }

  async listLive(phoneE164: string): Promise<LiveLink[]> {
    const now = this.now();
    const proven = await this.links.findVerifiedByPhone(phoneE164);
    const accounts = new Set<string>();
    const live: LiveLink[] = [];
    for (const link of proven) {
      // One entry per account: a second login of the same account adds nothing to choose.
      if (!isLive(link, now) || accounts.has(link.owner.ownerAccountId)) {
        continue;
      }
      accounts.add(link.owner.ownerAccountId);
      live.push({
        linkId: link.id,
        ownerUserId: link.ownerUserId,
        ownerAccountId: link.owner.ownerAccountId,
        accountName: link.owner.accountName,
        label: link.label,
      });
    }
    return live.slice(0, COACH_TEXT_MAX_ACCOUNTS_PER_PHONE);
  }

  async resolve(phoneE164: string): Promise<AccountResolution> {
    const live = await this.listLive(phoneE164);
    if (live.length === 0) {
      return { kind: 'none' };
    }
    if (live.length === 1) {
      return { kind: 'one', link: live[0] };
    }

    const conversation = await this.conversations.get(phoneE164);
    const until = conversation?.chosenUntil;
    if (conversation?.chosenLinkId && until && until.getTime() > this.now().getTime()) {
      const chosen = live.find((link) => link.linkId === conversation.chosenLinkId);
      if (chosen) {
        return { kind: 'chosen', link: chosen };
      }
    }
    return { kind: 'ask', options: live };
  }
}
