/**
 * Coach text commands: the phones on a login's list.
 *
 * The portal adds a phone with the person's name and gets a six-digit code. The
 * phone is linked only when it texts the code back, so the text is both the
 * proof that the person holds the phone and their opt-in. A login keeps up to
 * ten phones (its own and its helpers'), and one phone can work with up to nine
 * accounts. Linking a phone to another account never takes it from the first.
 */

import { randomUUID } from 'crypto';

import {
  COACH_TEXT_MAX_ACCOUNTS_PER_PHONE,
  COACH_TEXT_MAX_PHONES_PER_LOGIN,
  SMS_OWNER_CONSENT_TEXT_VERSION,
  SMS_PRODUCT_NUMBER_E164,
  SMS_PURPOSE_OWNER_COMMANDS,
  SMS_PURPOSE_VIEWER_NOTIFICATIONS,
  type CoachTextPhoneState,
} from '@fieldview/data-model';

import { AppError, BadRequestError, NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { maskPhoneE164, parseUsCanadaPhoneToE164 } from '../../lib/phone';

import { generateLinkCode, hashLinkCode, linkCodeMatches } from './codes';
import { MAX_CODE_ATTEMPTS, coachTextNumber, codeTtlSeconds, defaultTimeZone } from './config';
import type {
  AddPhoneInput,
  CoachTextLinkRecord,
  CoachTextPhoneView,
  CoachTextPortalStatus,
  ICoachTextCommandReader,
  ICoachTextConsent,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  ICoachTextNotifier,
  ICoachTextSettingsStore,
  IPhoneLinkInbound,
  IPhoneLinkPortal,
  IssuedCode,
  LinkCompletion,
  LinkRefusal,
} from './interfaces';
import { isIdle, isLive, mayUse } from './rules';

const CONSENT_SOURCE = 'inbound-link';

export interface PhoneLinkServiceDeps {
  links: ICoachTextLinkReader & ICoachTextLinkWriter;
  consent: ICoachTextConsent;
  commands: Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  notifier: ICoachTextNotifier;
  settings: ICoachTextSettingsStore;
  now?: () => Date;
}

function hasUnexpiredCode(link: CoachTextLinkRecord, now: Date): boolean {
  return (
    link.codeHash !== null &&
    link.codeExpiresAt !== null &&
    link.codeExpiresAt.getTime() > now.getTime()
  );
}

/** The code can still link: not expired and tries left. */
function isCodeLive(link: CoachTextLinkRecord, now: Date): boolean {
  return hasUnexpiredCode(link, now) && link.codeAttempts < MAX_CODE_ATTEMPTS;
}

/** Linked and used within the idle limit: nothing to prove again. */
function isInUse(link: CoachTextLinkRecord, now: Date): boolean {
  return link.verifiedAt !== null && !isIdle(link, now);
}

function stateOf(link: CoachTextLinkRecord, now: Date): CoachTextPhoneState {
  if (link.verifiedAt === null) {
    return 'pending';
  }
  if (isIdle(link, now)) {
    // A phone proving itself again shows as waiting while its new code lasts.
    return hasUnexpiredCode(link, now) ? 'pending' : 'expired';
  }
  return link.pausedAt ? 'paused' : 'linked';
}

/** The accounts a phone can act for now. */
function liveAccountCount(links: CoachTextLinkRecord[], now: Date): number {
  return new Set(links.filter((link) => isLive(link, now)).map((link) => link.owner.ownerAccountId)).size;
}

function refused(reason: LinkRefusal): LinkCompletion {
  return { matched: false, reason };
}

export class PhoneLinkService implements IPhoneLinkPortal, IPhoneLinkInbound {
  private readonly links: ICoachTextLinkReader & ICoachTextLinkWriter;
  private readonly consent: ICoachTextConsent;
  private readonly commands: Pick<ICoachTextCommandReader, 'countUnverifiedSince'>;
  private readonly notifier: ICoachTextNotifier;
  private readonly settings: ICoachTextSettingsStore;
  private readonly now: () => Date;

  constructor(deps: PhoneLinkServiceDeps) {
    this.links = deps.links;
    this.consent = deps.consent;
    this.commands = deps.commands;
    this.notifier = deps.notifier;
    this.settings = deps.settings;
    this.now = deps.now ?? ((): Date => new Date());
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  /**
   * Adds a phone to the login's list and makes its code. A number still waiting
   * gets a fresh code on its row. Whether another login uses the number is
   * never said: nothing changes for them until this phone texts the code.
   */
  async addPhone(input: AddPhoneInput): Promise<IssuedCode> {
    const now = this.now();
    const phone = this.parsePhone(input.phone);
    await this.keepFirstTimeZone(input.ownerUserId, input.timeZone);

    const existing = await this.links.findByOwnerAndPhone(input.ownerUserId, phone);
    if (existing) {
      if (isInUse(existing, now)) {
        throw new AppError('PHONE_ALREADY_ADDED', 'This number is already on your list.', 409);
      }
      return this.issueCode(existing.id, now, input.label);
    }

    const listed = await this.links.listByOwnerUserId(input.ownerUserId);
    if (listed.length >= COACH_TEXT_MAX_PHONES_PER_LOGIN) {
      throw new AppError(
        'PHONE_LIMIT_REACHED',
        `You can add up to ${COACH_TEXT_MAX_PHONES_PER_LOGIN} phones. Remove one first.`,
        409
      );
    }

    const id = randomUUID();
    const code = generateLinkCode();
    const codeExpiresAt = this.codeExpiry(now);
    await this.links.create({
      id,
      ownerUserId: input.ownerUserId,
      phoneE164: phone,
      label: input.label,
      codeHash: hashLinkCode(code, id),
      codeExpiresAt,
    });

    logger.info(
      { ownerUserId: input.ownerUserId, phone: maskPhoneE164(phone) },
      'Coach text phone added'
    );
    return { id, code, codeExpiresAt };
  }

  /** A new code for a phone still waiting, or one that went idle. */
  async newCode(ownerUserId: string, linkId: string): Promise<IssuedCode> {
    const now = this.now();
    const link = await this.ownLink(ownerUserId, linkId);
    if (!link) {
      throw new NotFoundError('Phone not found');
    }
    if (isInUse(link, now)) {
      throw new AppError('PHONE_ALREADY_LINKED', 'This phone is already linked.', 409);
    }
    return this.issueCode(link.id, now);
  }

  async getStatus(ownerUserId: string): Promise<CoachTextPortalStatus> {
    const now = this.now();
    const [timeZone, listed] = await Promise.all([
      this.settings.getTimeZone(ownerUserId),
      this.links.listByOwnerUserId(ownerUserId),
    ]);
    const phones = await Promise.all(listed.map((link) => this.viewOf(link, now)));
    return { timeZone: timeZone ?? defaultTimeZone(), phones };
  }

  async setTimeZone(ownerUserId: string, timeZone: string): Promise<void> {
    await this.settings.setTimeZone(ownerUserId, timeZone);
  }

  /**
   * Takes one phone off the login's list. Its opt-in is revoked only when no
   * other account still has the phone.
   */
  async removePhone(ownerUserId: string, linkId: string): Promise<{ removed: boolean }> {
    const link = await this.ownLink(ownerUserId, linkId);
    if (!link) {
      return { removed: false };
    }

    await this.links.delete(link.id);

    if (link.verifiedAt !== null) {
      const phone = link.phoneE164;
      const stillLinked = await this.links.findVerifiedByPhone(phone);
      if (stillLinked.length === 0) {
        await this.quietly('revoke consent after removal', () =>
          this.consent.revokeConsent(phone, SMS_PURPOSE_OWNER_COMMANDS)
        );
      }
      this.notify('removed', () =>
        this.notifier.removed({
          email: link.owner.email,
          accountName: link.owner.accountName,
          label: link.label,
          phoneMasked: maskPhoneE164(phone),
        })
      );
    }

    logger.info(
      { ownerUserId, phone: maskPhoneE164(link.phoneE164), wasLinked: link.verifiedAt !== null },
      'Coach text phone removed'
    );
    return { removed: true };
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
    if (!mayUse(owner)) {
      return refused('not_allowed');
    }

    const proven = await this.links.findVerifiedByPhone(input.from);
    const otherAccounts = new Set(
      proven
        .filter((link) => link.owner.ownerAccountId !== owner.ownerAccountId)
        .map((link) => link.owner.ownerAccountId)
    );
    if (otherAccounts.size >= COACH_TEXT_MAX_ACCOUNTS_PER_PHONE) {
      return refused('too_many_accounts');
    }

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

    await this.links.complete({ id: match.id, now, paused });

    // The link is made. Nothing below may undo it or fail the text.
    const accountCount = liveAccountCount(
      await this.links.findVerifiedByPhone(input.from).catch(() => [] as CoachTextLinkRecord[]),
      now
    );
    const phoneMasked = maskPhoneE164(input.from);
    this.notify('linked', () =>
      this.notifier.linked({
        email: owner.email,
        accountName: owner.accountName,
        label: match.label,
        phoneMasked,
        paused,
      })
    );

    logger.info(
      {
        ownerUserId: owner.ownerUserId,
        ownerAccountId: owner.ownerAccountId,
        phone: phoneMasked,
        paused,
        accountCount,
      },
      'Coach text phone linked'
    );

    return {
      matched: true,
      linkId: match.id,
      ownerUserId: owner.ownerUserId,
      ownerAccountId: owner.ownerAccountId,
      accountName: owner.accountName,
      label: match.label,
      paused,
      accountCount,
    };
  }

  /** A verified STOP pauses every account the phone works with. */
  async pause(phoneE164: string): Promise<void> {
    const held = await this.links.setPausedByPhone(phoneE164, this.now());
    if (!held) {
      return;
    }
    await this.consent.revokeConsent(phoneE164, SMS_PURPOSE_OWNER_COMMANDS);
    logger.info({ phone: maskPhoneE164(phoneE164) }, 'Coach text phone paused by STOP');
  }

  /** A verified START resumes every account the phone works with. */
  async resume(phoneE164: string): Promise<void> {
    const held = await this.links.setPausedByPhone(phoneE164, null);
    if (!held) {
      return;
    }
    await this.consent.clearRevocation(phoneE164, SMS_PURPOSE_OWNER_COMMANDS);
    logger.info({ phone: maskPhoneE164(phoneE164) }, 'Coach text phone resumed by START');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parsePhone(typed: string): string {
    const phone = parseUsCanadaPhoneToE164(typed);
    if (phone === coachTextNumber() || phone === SMS_PRODUCT_NUMBER_E164) {
      throw new BadRequestError('Enter a mobile number, not the FieldView number');
    }
    return phone;
  }

  /** The browser's zone becomes the login's only until the login picks one. */
  private async keepFirstTimeZone(ownerUserId: string, timeZone: string | undefined): Promise<void> {
    if (!timeZone || (await this.settings.getTimeZone(ownerUserId)) !== null) {
      return;
    }
    await this.settings.setTimeZone(ownerUserId, timeZone);
  }

  private codeExpiry(now: Date): Date {
    return new Date(now.getTime() + codeTtlSeconds() * 1000);
  }

  private async issueCode(linkId: string, now: Date, label?: string): Promise<IssuedCode> {
    const code = generateLinkCode();
    const codeExpiresAt = this.codeExpiry(now);
    await this.links.setCode(linkId, {
      codeHash: hashLinkCode(code, linkId),
      codeExpiresAt,
      ...(label === undefined ? {} : { label }),
    });
    return { id: linkId, code, codeExpiresAt };
  }

  /** The link, only when it is on this login's list. */
  private async ownLink(ownerUserId: string, linkId: string): Promise<CoachTextLinkRecord | null> {
    const link = await this.links.findById(linkId);
    return link && link.ownerUserId === ownerUserId ? link : null;
  }

  private async viewOf(link: CoachTextLinkRecord, now: Date): Promise<CoachTextPhoneView> {
    const state = stateOf(link, now);
    const waiting = state === 'pending';

    let unverifiedTextSeen = false;
    if (waiting && link.codeExpiresAt && hasUnexpiredCode(link, now)) {
      const codeMadeAt = new Date(link.codeExpiresAt.getTime() - codeTtlSeconds() * 1000);
      const seen = await this.commands.countUnverifiedSince(link.phoneE164, codeMadeAt);
      unverifiedTextSeen = seen > 0;
    }

    // A code with no tries left is as good as run out, so the page offers a new one.
    let codeExpiresAt = waiting ? link.codeExpiresAt : null;
    if (codeExpiresAt && link.codeAttempts >= MAX_CODE_ATTEMPTS && codeExpiresAt.getTime() > now.getTime()) {
      codeExpiresAt = now;
    }

    return {
      id: link.id,
      label: link.label,
      phoneMasked: maskPhoneE164(link.phoneE164),
      state,
      codeExpiresAt,
      verifiedAt: link.verifiedAt,
      lastCommandAt: link.lastCommandAt,
      unverifiedTextSeen,
    };
  }

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
