/**
 * Coach text commands: contracts.
 *
 * A coach links one phone to their login, then texts the FieldView number from
 * it. This file holds the small interfaces the module is built from, so each
 * part can be tested with an in-memory stand-in.
 */

import type { CoachTextLinkState } from '@fieldview/data-model';

// ── Inbound text ────────────────────────────────────────────────────────────

export interface InboundText {
  /** Sender in E.164 form. */
  from: string;
  /** The text as it arrived. */
  body: string;
  /** Twilio's id for the text. Null when the post carried none. */
  messageSid: string | null;
  /** True only when the relay confirmed Twilio's own signature. */
  twilioVerified: boolean;
  /** When the webhook received the text, in milliseconds. */
  receivedAtMs: number;
}

/** `handled: false` sends the text down the viewer path, unchanged. */
export type CoachTextResult = { handled: false } | { handled: true; twiml: string };

export interface ICoachTextEngine {
  /** Never throws. A failure answers `{ handled: false }`. */
  handleInbound(text: InboundText): Promise<CoachTextResult>;
  /** A STOP word arrived. Pauses the link for a verified text. Never throws. */
  handleOptOut(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void>;
  /** A START word arrived. Resumes the link for a verified text. Never throws. */
  handleOptIn(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<void>;
}

// ── Link records ────────────────────────────────────────────────────────────

/** The login a link belongs to, with what the module needs from its account. */
export interface CoachTextOwner {
  ownerUserId: string;
  email: string;
  /** `OwnerUser.status`. Only `active` logins may link. */
  loginStatus: string;
  ownerAccountId: string;
  accountName: string;
  /** `OwnerAccount.status`. */
  accountStatus: string;
  /** `OwnerAccount.isSuspended`. */
  accountSuspended: boolean;
}

export interface CoachTextLinkRecord {
  id: string;
  ownerUserId: string;
  /** The verified phone. Null until a LINK text arrives. */
  phoneE164: string | null;
  verifiedAt: Date | null;
  lastCommandAt: Date | null;
  /** Set while the phone has texted STOP. */
  pausedAt: Date | null;
  /** The phone typed in the portal, waiting for its LINK text. */
  pendingPhoneE164: string | null;
  codeHash: string | null;
  codeExpiresAt: Date | null;
  /** Wrong codes texted from the pending phone since the code was made. */
  codeAttempts: number;
  timeZone: string | null;
  owner: CoachTextOwner;
}

export interface ICoachTextLinkReader {
  findByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord | null>;
  /** The link whose verified phone is this one. */
  findByPhone(phoneE164: string): Promise<CoachTextLinkRecord | null>;
  /** Every link waiting for a LINK text from this phone. */
  findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]>;
  /** True when the phone is linked to, or waiting on, any login. */
  isKnownPhone(phoneE164: string): Promise<boolean>;
}

export interface SetPendingLinkInput {
  pendingPhoneE164: string;
  codeHash: string;
  codeExpiresAt: Date;
  /** Left as it is when not given. */
  timeZone?: string;
}

export interface CompleteLinkInput {
  id: string;
  phoneE164: string;
  now: Date;
  /** Link the phone already paused (it had texted STOP before). */
  paused: boolean;
}

export interface ICoachTextLinkWriter {
  /** The login's link row, made empty when there is none. */
  ensure(ownerUserId: string): Promise<CoachTextLinkRecord>;
  /** Stores a new code and sets the try count back to zero. */
  setPending(id: string, input: SetPendingLinkInput): Promise<void>;
  addFailedAttempt(ids: string[]): Promise<void>;
  /**
   * One transaction: takes the phone away from any other login that holds it,
   * then makes it this login's verified phone and clears the code.
   */
  complete(input: CompleteLinkInput): Promise<void>;
  setTimeZone(id: string, timeZone: string): Promise<void>;
  delete(id: string): Promise<void>;
  /** Answers whether a link holds this phone. */
  setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean>;
}

// ── Command log ─────────────────────────────────────────────────────────────

export type CoachTextInterpreter = 'link' | 'answer' | 'rules' | 'model' | 'none';

export type CoachTextCommandStatus =
  | 'received'
  | 'done'
  | 'asked'
  | 'no_change'
  | 'not_understood'
  | 'rejected'
  | 'failed'
  | 'timeout';

export interface BeginCommandInput {
  messageSid: string;
  phoneE164: string;
  /** What to keep of the text. A link code is never stored. */
  body: string;
  interpreter: CoachTextInterpreter;
}

export interface FinishCommandInput {
  status: CoachTextCommandStatus;
  reason?: string;
  replyText?: string | null;
  latencyMs?: number;
  ownerUserId?: string;
  ownerAccountId?: string;
}

export interface UnverifiedTextInput {
  phoneE164: string;
  twilioVerified: boolean;
  reason: 'unverified' | 'no_message_sid';
}

export interface ICoachTextCommandWriter {
  /** Opens the row for a text. `duplicate` when its id was seen before. */
  begin(input: BeginCommandInput): Promise<{ id: string } | 'duplicate'>;
  finish(id: string, input: FinishCommandInput): Promise<void>;
  /** Notes a text that could not be trusted. Keeps no body and no owner. */
  recordUnverified(input: UnverifiedTextInput): Promise<void>;
}

export interface CoachTextHistoryRow {
  createdAt: Date;
  body: string;
  status: string;
  replyText: string | null;
}

export interface ICoachTextCommandReader {
  countUnverifiedSince(phoneE164: string, since: Date): Promise<number>;
  /** Newest first, this login's own rows only. */
  listForOwnerUser(ownerUserId: string, limit: number): Promise<CoachTextHistoryRow[]>;
}

// ── Consent (the slice of the consent store this module uses) ───────────────

export interface CoachTextConsentInput {
  phoneE164: string;
  purpose: string;
  consentTextVersion: string;
  source: string;
}

export interface ICoachTextConsent {
  getByPhoneAndPurpose(
    phoneE164: string,
    purpose: string
  ): Promise<{ revokedAt: Date | null } | null>;
  recordConsent(input: CoachTextConsentInput): Promise<unknown>;
  revokeConsent(phoneE164: string, purpose: string): Promise<void>;
  clearRevocation(phoneE164: string, purpose: string): Promise<void>;
}

// ── Notices (email to the login when a link changes) ────────────────────────

export interface ICoachTextNotifier {
  linked(input: {
    email: string;
    accountName: string;
    phoneMasked: string;
    paused: boolean;
  }): Promise<void>;
  /** The phone now belongs to another login. Never names that login. */
  movedAway(input: { email: string; phoneMasked: string }): Promise<void>;
  unlinked(input: { email: string; accountName: string; phoneMasked: string }): Promise<void>;
}

// ── Linking ─────────────────────────────────────────────────────────────────

export interface StartLinkInput {
  ownerUserId: string;
  /** As typed. US and Canadian numbers only. */
  phone: string;
  timeZone?: string;
}

export interface StartedLink {
  /** Six digits. Returned once and never stored or logged. */
  code: string;
  codeExpiresAt: Date;
}

export interface CoachTextLinkStatus {
  state: CoachTextLinkState;
  phoneMasked: string | null;
  pendingPhoneMasked: string | null;
  codeExpiresAt: Date | null;
  /** A text came from the pending phone but could not be verified. */
  unverifiedTextSeen: boolean;
  verifiedAt: Date | null;
  lastCommandAt: Date | null;
  timeZone: string;
}

/** Why a LINK text did not link. Kept in the log; the texter sees one answer. */
export type LinkRefusal = 'no_pending' | 'expired' | 'too_many_tries' | 'wrong_code' | 'not_allowed';

export type LinkCompletion =
  | { matched: false; reason: LinkRefusal }
  | {
      matched: true;
      ownerUserId: string;
      ownerAccountId: string;
      accountName: string;
      /** The phone had texted STOP, so FieldView cannot reply to it. */
      paused: boolean;
    };

/** What the owner portal needs. */
export interface IPhoneLinkPortal {
  startLink(input: StartLinkInput): Promise<StartedLink>;
  getStatus(ownerUserId: string): Promise<CoachTextLinkStatus>;
  setTimeZone(ownerUserId: string, timeZone: string): Promise<void>;
  unlink(ownerUserId: string): Promise<{ unlinked: boolean }>;
}

/** What the inbound text path needs. */
export interface IPhoneLinkInbound {
  completeFromText(input: { from: string; code: string }): Promise<LinkCompletion>;
  pause(phoneE164: string): Promise<void>;
  resume(phoneE164: string): Promise<void>;
}

// ── Owner login lookup ──────────────────────────────────────────────────────

export interface OwnerLogin {
  ownerUserId: string;
  ownerAccountId: string;
  email: string;
  status: string;
}

export interface IOwnerLoginReader {
  findByEmail(email: string): Promise<OwnerLogin | null>;
}
