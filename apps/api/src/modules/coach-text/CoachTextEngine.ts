/**
 * Coach text commands: the inbound text path.
 *
 * The webhook hands every inbound text here before the viewer path. The engine
 * acts only on a text the relay verified, and answers `{ handled: false }` for
 * everything else, so a text from anyone who is not a linked phone gets the
 * same answer it always got.
 *
 * What it handles so far:
 *   LINK <code>   links the phone to the account whose portal made the code.
 *   ACCOUNT       a phone on several accounts chooses which one it texts for.
 *   0-9           answers the phone's open question.
 */

import { randomUUID } from 'crypto';

import {
  COACH_TEXT_MAX_ACCOUNTS_PER_PHONE,
  CoachTextQuestionSchema,
  type CoachTextQuestion,
} from '@fieldview/data-model';

import { logger } from '../../lib/logger';
import { maskPhoneE164 } from '../../lib/phone';

import { maskLinkText, parseLinkText } from './codes';
import {
  MAX_UNVERIFIED_NOTES_PER_HOUR,
  accountChoiceHours,
  defaultTimeZone,
  isCoachTextEnabled,
  questionTtlSeconds,
} from './config';
import type {
  CoachTextResult,
  FinishCommandInput,
  IAccountChooser,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  ICoachTextConversationStore,
  ICoachTextEngine,
  ICoachTextLinkReader,
  ICoachTextSettingsStore,
  InboundText,
  IPhoneLinkInbound,
  LiveLink,
} from './interfaces';
import { replies } from './reply/replies';
import { emptyTwiml, toSmsText, twimlMessage } from './reply/twiml';

const HOUR_MS = 60 * 60 * 1000;
const ACCOUNT_WORD = 'ACCOUNT';
const PICK_ACCOUNT = 'pick_account';

export interface CoachTextEngineDeps {
  linking: IPhoneLinkInbound;
  links: Pick<ICoachTextLinkReader, 'isKnownPhone'>;
  commands: ICoachTextCommandWriter & Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  chooser: IAccountChooser;
  conversations: ICoachTextConversationStore;
  settings: Pick<ICoachTextSettingsStore, 'getTimeZone'>;
  now?: () => Date;
  /** Makes the id of each question asked. */
  newId?: () => string;
}

/**
 * The `x-relay-twilio-verified` header can be trusted only when the relay's
 * own signature was checked, and that check needs the shared secret.
 */
function isOn(): boolean {
  return isCoachTextEnabled() && (process.env.RELAY_INBOUND_SECRET ?? '').trim().length > 0;
}

function handledWith(reply: string): CoachTextResult {
  return { handled: true, twiml: twimlMessage(reply) };
}

/** `6:00 PM` in the account's time zone. */
function clockTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(at);
}

export class CoachTextEngine implements ICoachTextEngine {
  private readonly linking: IPhoneLinkInbound;
  private readonly links: Pick<ICoachTextLinkReader, 'isKnownPhone'>;
  private readonly commands: ICoachTextCommandWriter &
    Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  private readonly chooser: IAccountChooser;
  private readonly conversations: ICoachTextConversationStore;
  private readonly settings: Pick<ICoachTextSettingsStore, 'getTimeZone'>;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(deps: CoachTextEngineDeps) {
    this.linking = deps.linking;
    this.links = deps.links;
    this.commands = deps.commands;
    this.chooser = deps.chooser;
    this.conversations = deps.conversations;
    this.settings = deps.settings;
    this.now = deps.now ?? ((): Date => new Date());
    this.newId = deps.newId ?? ((): string => randomUUID());
  }

  async handleInbound(text: InboundText): Promise<CoachTextResult> {
    try {
      if (!isOn()) {
        return { handled: false };
      }
      if (!text.twilioVerified || text.messageSid === null) {
        await this.noteUnverified(text);
        return { handled: false };
      }
      const code = parseLinkText(text.body);
      if (code !== null) {
        return await this.handleLink(text, text.messageSid, code);
      }
      const word = text.body.trim().toUpperCase();
      if (/^\d$/.test(word)) {
        return await this.handleDigit(text, text.messageSid, Number(word));
      }
      if (word === ACCOUNT_WORD) {
        return await this.handleAccount(text, text.messageSid);
      }
      return { handled: false };
    } catch (error) {
      logger.warn(
        { error, phone: maskPhoneE164(text.from) },
        'Coach text handling failed; the text goes to the viewer path'
      );
      return { handled: false };
    }
  }

  async handleOptOut(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void> {
    if (!isOn() || !text.twilioVerified) {
      return;
    }
    try {
      await this.linking.pause(text.from);
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text pause on STOP failed');
    }
  }

  async handleOptIn(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void> {
    if (!isOn() || !text.twilioVerified) {
      return;
    }
    try {
      await this.linking.resume(text.from);
    } catch (error) {
      logger.warn({ error, phone: maskPhoneE164(text.from) }, 'Coach text resume on START failed');
    }
  }

  // ── LINK <code> ───────────────────────────────────────────────────────────

  private async handleLink(
    text: InboundText,
    messageSid: string,
    code: string
  ): Promise<CoachTextResult> {
    const begun = await this.commands.begin({
      messageSid,
      phoneE164: text.from,
      body: maskLinkText(),
      interpreter: 'link',
    });
    if (begun === 'duplicate') {
      // The same text, delivered again. It was answered the first time.
      return { handled: true, twiml: emptyTwiml() };
    }

    try {
      const outcome = await this.linking.completeFromText({ from: text.from, code });

      if (!outcome.matched) {
        const reply =
          outcome.reason === 'too_many_accounts'
            ? replies.linkTooManyAccounts(COACH_TEXT_MAX_ACCOUNTS_PER_PHONE)
            : replies.linkNoMatch();
        await this.close(begun.id, text, { status: 'rejected', reason: outcome.reason, replyText: toSmsText(reply) });
        return handledWith(reply);
      }

      // A paused phone texted STOP before, so no text may go back to it.
      let reply: string | null = null;
      if (!outcome.paused) {
        reply =
          outcome.accountCount > 1
            ? replies.linkedToo(outcome.accountName, outcome.accountCount)
            : replies.linked(outcome.accountName);
      }
      await this.close(begun.id, text, {
        status: 'done',
        reason: outcome.paused ? 'linked_paused' : 'linked',
        replyText: reply === null ? null : toSmsText(reply),
        ownerUserId: outcome.ownerUserId,
        ownerAccountId: outcome.ownerAccountId,
        phoneLabel: outcome.label,
      });
      return reply === null ? { handled: true, twiml: emptyTwiml() } : handledWith(reply);
    } catch (error) {
      await this.close(begun.id, text, { status: 'failed', reason: 'error' });
      throw error;
    }
  }

  // ── ACCOUNT ───────────────────────────────────────────────────────────────

  private async handleAccount(text: InboundText, messageSid: string): Promise<CoachTextResult> {
    const live = await this.chooser.listLive(text.from);
    if (live.length === 0) {
      // Not a linked phone: the word means nothing here, as before.
      return { handled: false };
    }

    const begun = await this.commands.begin({
      messageSid,
      phoneE164: text.from,
      body: ACCOUNT_WORD,
      interpreter: 'rules',
    });
    if (begun === 'duplicate') {
      return { handled: true, twiml: emptyTwiml() };
    }

    try {
      if (live.length === 1) {
        const [only] = live;
        const reply = replies.accountOnlyOne(only.accountName);
        await this.close(begun.id, text, {
          status: 'no_change',
          reason: 'one_account',
          replyText: toSmsText(reply),
          ...this.ownerOf(only),
        });
        return handledWith(reply);
      }

      const now = this.now();
      const conversation = await this.conversations.get(text.from);
      const current =
        conversation?.chosenUntil && conversation.chosenUntil.getTime() > now.getTime()
          ? conversation.chosenLinkId
          : null;

      const question: CoachTextQuestion = {
        v: 1,
        kind: PICK_ACCOUNT,
        options: live.map((link, index) => ({
          n: index + 1,
          label: link.accountName.slice(0, 160) || 'Account',
          linkId: link.linkId,
        })),
      };
      await this.conversations.ask(text.from, {
        pendingId: this.newId(),
        question,
        expiresAt: new Date(now.getTime() + questionTtlSeconds() * 1000),
      });

      const reply = replies.accountQuestion(
        live.map((link, index) => ({
          n: index + 1,
          accountName: link.accountName,
          current: link.linkId === current,
        }))
      );
      // The text is for no one account yet, so it sits in no login's history.
      await this.close(begun.id, text, { status: 'asked', reason: PICK_ACCOUNT, replyText: toSmsText(reply) });
      return handledWith(reply);
    } catch (error) {
      await this.close(begun.id, text, { status: 'failed', reason: 'error' });
      throw error;
    }
  }

  // ── A digit: the answer to the open question ──────────────────────────────

  private async handleDigit(text: InboundText, messageSid: string, digit: number): Promise<CoachTextResult> {
    const now = this.now();
    const conversation = await this.conversations.get(text.from);
    const pendingId = conversation?.pendingId;
    if (
      !conversation ||
      !pendingId ||
      !conversation.pendingExpiresAt ||
      conversation.pendingExpiresAt.getTime() <= now.getTime()
    ) {
      // No question open: a digit means what it always meant.
      return { handled: false };
    }
    const parsed = CoachTextQuestionSchema.safeParse(conversation.pendingQuestion);
    if (!parsed.success || parsed.data.kind !== PICK_ACCOUNT) {
      return { handled: false };
    }
    const live = await this.chooser.listLive(text.from);
    if (live.length === 0) {
      return { handled: false };
    }

    const begun = await this.commands.begin({
      messageSid,
      phoneE164: text.from,
      body: String(digit),
      interpreter: 'answer',
    });
    if (begun === 'duplicate') {
      return { handled: true, twiml: emptyTwiml() };
    }

    try {
      const options = parsed.data.options;

      if (digit === 0) {
        const won = await this.conversations.answer(text.from, { pendingId, now });
        const reply = won ? replies.nothingChanged() : replies.questionClosed();
        await this.close(begun.id, text, {
          status: won ? 'no_change' : 'rejected',
          reason: won ? 'none_of_these' : 'question_closed',
          replyText: toSmsText(reply),
        });
        return handledWith(reply);
      }

      const option = options.find((candidate) => candidate.n === digit);
      if (!option?.linkId) {
        // The question stays open for a number from the list.
        const reply = replies.answerNotAnOption(options.length);
        await this.close(begun.id, text, {
          status: 'not_understood',
          reason: 'not_an_option',
          replyText: toSmsText(reply),
        });
        return handledWith(reply);
      }

      const link = live.find((candidate) => candidate.linkId === option.linkId);
      if (!link) {
        await this.conversations.answer(text.from, { pendingId, now });
        const reply = replies.accountGone();
        await this.close(begun.id, text, { status: 'rejected', reason: 'account_gone', replyText: toSmsText(reply) });
        return handledWith(reply);
      }

      const until = new Date(now.getTime() + accountChoiceHours() * HOUR_MS);
      const won = await this.conversations.answer(text.from, {
        pendingId,
        now,
        choose: { linkId: link.linkId, until },
      });
      if (!won) {
        const reply = replies.questionClosed();
        await this.close(begun.id, text, { status: 'rejected', reason: 'question_closed', replyText: toSmsText(reply) });
        return handledWith(reply);
      }

      const timeZone = (await this.settings.getTimeZone(link.ownerUserId)) ?? defaultTimeZone();
      const reply = replies.accountChosen(link.accountName, clockTime(until, timeZone));
      await this.close(begun.id, text, {
        status: 'done',
        reason: 'account_chosen',
        replyText: toSmsText(reply),
        ...this.ownerOf(link),
      });
      return handledWith(reply);
    } catch (error) {
      await this.close(begun.id, text, { status: 'failed', reason: 'error' });
      throw error;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private ownerOf(link: LiveLink): Pick<FinishCommandInput, 'ownerUserId' | 'ownerAccountId' | 'phoneLabel'> {
    return { ownerUserId: link.ownerUserId, ownerAccountId: link.ownerAccountId, phoneLabel: link.label };
  }

  /** Closes the log row. The reply matters more than the row, so a failure is only logged. */
  private async close(id: string, text: InboundText, input: Omit<FinishCommandInput, 'latencyMs'>): Promise<void> {
    try {
      await this.commands.finish(id, { ...input, latencyMs: this.latency(text) });
    } catch (error) {
      logger.warn({ error, commandId: id }, 'Coach text log row could not be closed');
    }
  }

  /**
   * Lets the portal say "a text arrived but could not be verified". Notes only
   * phones a login knows, and only a few an hour, so strangers cannot fill the log.
   */
  private async noteUnverified(text: InboundText): Promise<void> {
    if (!(await this.links.isKnownPhone(text.from))) {
      return;
    }
    const since = new Date(this.now().getTime() - HOUR_MS);
    const noted = await this.commands.countUnverifiedSince(text.from, since);
    if (noted >= MAX_UNVERIFIED_NOTES_PER_HOUR) {
      return;
    }
    await this.commands.recordUnverified({
      phoneE164: text.from,
      twilioVerified: text.twilioVerified,
      reason: text.twilioVerified ? 'no_message_sid' : 'unverified',
    });
  }

  private latency(text: InboundText): number {
    return Math.max(0, this.now().getTime() - text.receivedAtMs);
  }
}
