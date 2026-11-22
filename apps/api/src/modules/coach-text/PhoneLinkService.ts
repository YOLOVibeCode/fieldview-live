/**
 * Coach text commands: linking a phone to a login.
 *
 * The portal makes a six-digit code for a phone number. The link is made only
 * when that phone texts the code back, so the text is both the proof that the
 * coach holds the phone and the coach's opt-in.
 */

import {
  SMS_OWNER_CONSENT_TEXT_VERSION,
  SMS_PRODUCT_NUMBER_E164,
  SMS_PURPOSE_OWNER_COMMANDS,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  type CoachTextLinkState,
} from '@fieldview/data-model';

import { BadRequestError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { maskPhoneE164, parseUsCanadaPhoneToE164 } from '../../lib/phone';

import { generateLinkCode, hashLinkCode, linkCodeMatches } from './codes';
import {
  MAX_CODE_ATTEMPTS,
  coachTextNumber,
  codeTtlSeconds,
  defaultTimeZone,
  isOwnerAllowed,
  linkIdleDays,
} from './config';
import type {
  CoachTextLinkRecord,
  CoachTextLinkStatus,
  CoachTextOwner,
  ICoachTextCommandReader,
  ICoachTextConsent,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  ICoachTextNotifier,
  IPhoneLinkInbound,
  IPhoneLinkPortal,
  LinkCompletion,
  LinkRefusal,
  StartLinkInput,
  StartedLink,
} from './interfaces';

const CONSENT_SOURCE = 'inbound-link';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PhoneLinkServiceDeps {
  links: ICoachTextLinkReader & ICoachTextLinkWriter;
  consent: ICoachTextConsent;
  commands: Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  notifier: ICoachTextNotifier;
  now?: () => Date;
}

function hasUnexpiredCode(link: CoachTextLinkRecord, now: Date): boolean {
  return (
    link.pendingPhoneE164 !== null &&
    link.codeHash !== null &&
    link.codeExpiresAt !== null &&
    link.codeExpiresAt.getTime() > now.getTime()
  );
}

/** The code can still link: not expired and tries left. */
function isCodeLive(link: CoachTextLinkRecord, now: Date): boolean {
  return hasUnexpiredCode(link, now) && link.codeAttempts < MAX_CODE_ATTEMPTS;
}

function isIdle(link: CoachTextLinkRecord, now: Date): boolean {
  const last = link.lastCommandAt ?? link.verifiedAt;
  return last !== null && now.getTime() - last.getTime() > linkIdleDays() * DAY_MS;
}

/** Owner accounts stay `pending_verification` for a long time, so only a suspension blocks. */
function mayLink(owner: CoachTextOwner): boolean {
  return (
    owner.loginStatus === 'active' &&
    owner.accountStatus !== 'suspended' &&
    !owner.accountSuspended &&
    isOwnerAllowed(owner.ownerAccountId)
  );
}

function refused(reason: LinkRefusal): LinkCompletion {
  return { matched: false, reason };
}

export class PhoneLinkService implements IPhoneLinkPortal, IPhoneLinkInbound {
  private readonly links: ICoachTextLinkReader & ICoachTextLinkWriter;
  private readonly consent: ICoachTextConsent;
  private readonly commands: Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  private readonly notifier: ICoachTextNotifier;
  private readonly now: () => Date;

  constructor(deps: PhoneLinkServiceDeps) {
    this.links = deps.links;
    this.consent = deps.consent;
    this.commands = deps.commands;
    this.notifier = deps.notifier;
    this.now = deps.now ?? ((): Date => new Date());
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  /**
   * Makes a code for a phone. Nothing changes for a phone that is already
   * linked, to this login or another, until the code is texted from it.
   */
  async startLink(input: StartLinkInput): Promise<StartedLink> {
    const phone = parseUsCanadaPhoneToE164(input.phone);
    if (phone === coachTextNumber() || phone === SMS_PRODUCT_NUMBER_E164) {
      throw new BadRequestError('Enter your own mobile number, not the FieldView number');
    }

    const link = await this.links.ensure(input.ownerUserId);
    const code = generateLinkCode();
    const codeExpiresAt = new Date(this.now().getTime() + codeTtlSeconds() * 1000);
    await this.links.setPending(link.id, {
      pendingPhoneE164: phone,
      codeHash: hashLinkCode(code, link.id),
      codeExpiresAt,
      timeZone: input.timeZone,
    });

    logger.info(
      { ownerUserId: input.ownerUserId, phone: maskPhoneE164(phone) },
      'Coach text link code made'
    );
    return { code, codeExpiresAt };
  }

  async getStatus(ownerUserId: string): Promise<CoachTextLinkStatus> {
    const now = this.now();
    const link = await this.links.findByOwnerUserId(ownerUserId);
    if (!link) {
      return {
        state: 'none',
        phoneMasked: null,
        pendingPhoneMasked: null,
        codeExpiresAt: null,
        unverifiedTextSeen: false,
        verifiedAt: null,
        lastCommandAt: null,
        timeZone: defaultTimeZone(),
      };
    }

    const waiting = isCodeLive(link, now);
    const hasPhone = link.phoneE164 !== null && link.verifiedAt !== null;

    let state: CoachTextLinkState;
    if (waiting) {
      state = 'pending';
    } else if (!hasPhone) {
      state = 'none';
    } else if (isIdle(link, now)) {
      state = 'expired';
    } else if (link.pausedAt) {
      state = 'paused';
    } else {
      state = 'linked';
    }

    let unverifiedTextSeen = false;
    if (waiting && link.pendingPhoneE164 && link.codeExpiresAt) {
      const codeMadeAt = new Date(link.codeExpiresAt.getTime() - codeTtlSeconds() * 1000);
      const seen = await this.commands.countUnverifiedSince(link.pendingPhoneE164, codeMadeAt);
      unverifiedTextSeen = seen > 0;
    }

    return {
      state,
      phoneMasked: hasPhone && link.phoneE164 ? maskPhoneE164(link.phoneE164) : null,
      pendingPhoneMasked:
        waiting && link.pendingPhoneE164 ? maskPhoneE164(link.pendingPhoneE164) : null,
      codeExpiresAt: waiting ? link.codeExpiresAt : null,
      unverifiedTextSeen,
      verifiedAt: hasPhone ? link.verifiedAt : null,
      lastCommandAt: hasPhone ? link.lastCommandAt : null,
      timeZone: link.timeZone ?? defaultTimeZone(),
    };
  }

  async setTimeZone(ownerUserId: string, timeZone: string): Promise<void> {
    const link = await this.links.ensure(ownerUserId);
    await this.links.setTimeZone(link.id, timeZone);
  }

  async unlink(ownerUserId: string): Promise<{ unlinked: boolean }> {
    const link = await this.links.findByOwnerUserId(ownerUserId);
    if (!link || (link.phoneE164 === null && link.pendingPhoneE164 === null)) {
      return { unlinked: false };
    }

    await this.links.delete(link.id);

    const phone = link.phoneE164;
    if (phone !== null) {
      await this.quietly('revoke consent after unlink', () =>
        this.consent.revokeConsent(phone, SMS_PURPOSE_OWNER_COMMANDS)
      );
      this.notify('unlinked', () =>
        this.notifier.unlinked({
          email: link.owner.email,
          accountName: link.owner.accountName,
          phoneMasked: maskPhoneE164(phone),
        })
      );
    }

    logger.info({ ownerUserId, hadPhone: phone !== null }, 'Coach text link removed');
    return { unlinked: true };
  }

  // ── Inbound texts ─────────────────────────────────────────────────────────

  /**
   * Called only for a text the relay verified. Tries count only here, so a
   * forged text cannot use them up.
   */
  async completeFromText(input: { from: string; code: string }): Promise<LinkCompletion> {
    const now = this.now();
    const pending = await this.links.findPendingByPhone(input.from);
    if (pending.length === 0) {
      return refused('no_pending');
    }

    const live = pending.filter((link) => isCodeLive(link, now));
    if (live.length === 0) {
      const outOfTries = pending.some((link) => hasUnexpiredCode(link, now));
      return refused(outOfTries ? 'too_many_tries' : 'expired');
    }

    const match = live.find((link) => linkCodeMatches(input.code, link.id, link.codeHash));
    if (!match) {
      await this.links.addFailedAttempt(live.map((link) => link.id));
      return refused('wrong_code');
    }

    const owner = match.owner;
    if (!mayLink(owner)) {
      return refused('not_allowed');
    }

    const previousHolder = await this.links.findByPhone(input.from);
    const viewerConsent = await this.consent.getByPhoneAndPurpose(
      input.from,
      SMS_PURPOSE_VIEWER_NOTIFICATIONS
    );
    // The phone texted STOP before, so FieldView may not text it until START.
    const paused = Boolean(viewerConsent?.revokedAt);

    // Consent first: a link must never exist without its opt-in on record.
    await this.consent.recordConsent({
      phoneE164: input.from,
      purpose: SMS_PURPOSE_OWNER_COMMANDS,
      consentTextVersion: SMS_OWNER_CONSENT_TEXT_VERSION,
      source: CONSENT_SOURCE,
    });
    if (paused) {
      await this.consent.revokeConsent(input.from, SMS_PURPOSE_OWNER_COMMANDS);
    }

    await this.links.complete({ id: match.id, phoneE164: input.from, now, paused });

    // The link is made. Nothing below may undo it or fail the text.
    const replacedPhone = match.phoneE164;
    if (replacedPhone !== null && replacedPhone !== input.from) {
      await this.quietly('revoke consent for the replaced phone', () =>
        this.consent.revokeConsent(replacedPhone, SMS_PURPOSE_OWNER_COMMANDS)
      );
    }

    const phoneMasked = maskPhoneE164(input.from);
    this.notify('linked', () =>
      this.notifier.linked({
        email: owner.email,
        accountName: owner.accountName,
        phoneMasked,
        paused,
      })
    );
    if (previousHolder && previousHolder.ownerUserId !== owner.ownerUserId) {
      const earlierEmail = previousHolder.owner.email;
      this.notify('movedAway', () =>
        this.notifier.movedAway({ email: earlierEmail, phoneMasked })
      );
    }

    logger.info(
      {
        ownerUserId: owner.ownerUserId,
        ownerAccountId: owner.ownerAccountId,
        phone: phoneMasked,
        paused,
        moved: Boolean(previousHolder && previousHolder.ownerUserId !== owner.ownerUserId),
      },
      'Coach text phone linked'
    );

    return {
      matched: true,
      ownerUserId: owner.ownerUserId,
      ownerAccountId: owner.ownerAccountId,
      accountName: owner.accountName,
      paused,
    };
  }

  /** A verified STOP. Does nothing for a phone no login holds. */
  async pause(phoneE164: string): Promise<void> {
    const held = await this.links.setPausedByPhone(phoneE164, this.now());
    if (!held) {
      return;
    }
    await this.consent.revokeConsent(phoneE164, SMS_PURPOSE_OWNER_COMMANDS);
    logger.info({ phone: maskPhoneE164(phoneE164) }, 'Coach text link paused by STOP');
  }

  /** A verified START. Does nothing for a phone no login holds. */
  async resume(phoneE164: string): Promise<void> {
    const held = await this.links.setPausedByPhone(phoneE164, null);
    if (!held) {
      return;
    }
    await this.consent.clearRevocation(phoneE164, SMS_PURPOSE_OWNER_COMMANDS);
    logger.info({ phone: maskPhoneE164(phoneE164) }, 'Coach text link resumed by START');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Runs a follow-up step whose failure must not fail the caller. */
  private async quietly(what: string, step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (error) {
      logger.warn({ error, what }, 'Coach text follow-up step failed');
    }
  }

  /** Sends a notice without waiting for it. A failed email never fails a link. */
  private notify(kind: string, send: () => Promise<void>): void {
    try {
      send().catch((error: unknown) => {
        logger.warn({ error, kind }, 'Coach text notice email failed');
      });
    } catch (error) {
      logger.warn({ error, kind }, 'Coach text notice email failed');
    }
  }
}
