/**
 * Coach text commands: the inbound text path.
 *
 * The webhook hands every inbound text here before the viewer path. The engine
 * acts only on a text the relay verified, and answers `{ handled: false }` for
 * everything else, so a text from anyone who is not linking a phone gets the
 * same answer it always got.
 *
 * In this first step the only command is `LINK <code>`.
 */

import { logger } from '../../lib/logger';
import { maskPhoneE164 } from '../../lib/phone';

import { maskLinkText, parseLinkText } from './codes';
import { MAX_UNVERIFIED_NOTES_PER_HOUR, isCoachTextEnabled } from './config';
import type {
  CoachTextResult,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  ICoachTextEngine,
  ICoachTextLinkReader,
  InboundText,
  IPhoneLinkInbound,
} from './interfaces';
import { replies } from './reply/replies';
import { emptyTwiml, toSmsText, twimlMessage } from './reply/twiml';

const HOUR_MS = 60 * 60 * 1000;

export interface CoachTextEngineDeps {
  linking: IPhoneLinkInbound;
  links: Pick<ICoachTextLinkReader, 'isKnownPhone'>;
  commands: ICoachTextCommandWriter & Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  now?: () => Date;
}

/**
 * The `x-relay-twilio-verified` header can be trusted only when the relay's
 * own signature was checked, and that check needs the shared secret.
 */
function isOn(): boolean {
  return isCoachTextEnabled() && (process.env.RELAY_INBOUND_SECRET ?? '').trim().length > 0;
}

export class CoachTextEngine implements ICoachTextEngine {
  private readonly linking: IPhoneLinkInbound;
  private readonly links: Pick<ICoachTextLinkReader, 'isKnownPhone'>;
  private readonly commands: ICoachTextCommandWriter &
    Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  private readonly now: () => Date;

  constructor(deps: CoachTextEngineDeps) {
    this.linking = deps.linking;
    this.links = deps.links;
    this.commands = deps.commands;
    this.now = deps.now ?? ((): Date => new Date());
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
      if (code === null) {
        return { handled: false };
      }
      return await this.handleLink(text, text.messageSid, code);
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
        const reply = replies.linkNoMatch();
        await this.close(begun.id, {
          status: 'rejected',
          reason: outcome.reason,
          replyText: toSmsText(reply),
          latencyMs: this.latency(text),
        });
        return { handled: true, twiml: twimlMessage(reply) };
      }

      // A paused phone texted STOP before, so no text may go back to it.
      const reply = outcome.paused ? null : replies.linked(outcome.accountName);
      await this.close(begun.id, {
        status: 'done',
        reason: outcome.paused ? 'linked_paused' : 'linked',
        replyText: reply === null ? null : toSmsText(reply),
        latencyMs: this.latency(text),
        ownerUserId: outcome.ownerUserId,
        ownerAccountId: outcome.ownerAccountId,
      });
      return { handled: true, twiml: reply === null ? emptyTwiml() : twimlMessage(reply) };
    } catch (error) {
      await this.close(begun.id, {
        status: 'failed',
        reason: 'error',
        latencyMs: this.latency(text),
      });
      throw error;
    }
  }

  /** Closes the log row. The reply matters more than the row, so a failure is only logged. */
  private async close(
    id: string,
    input: Parameters<ICoachTextCommandWriter['finish']>[1]
  ): Promise<void> {
    try {
      await this.commands.finish(id, input);
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
