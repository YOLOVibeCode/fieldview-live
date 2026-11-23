/**
 * Coach text commands: contracts.
 *
 * A login keeps a list of phones, its own and its helpers', and each texts the
 * FieldView number for that login's account. One phone may also be on several
 * logins, each its own account; the phone then says which account it texts for.
 * This file holds the small interfaces the module is built from, so each part
 * can be tested with an in-memory stand-in.
 */

import type { CoachTextPhoneState, CoachTextQuestion } from '@fieldview/data-model';

import type { LiveStream, OwnerLiveStreams } from '../camera-sources/interfaces';

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
  /**
   * YES arrived while the phone has a numbered question open: the reply that
   * says to answer with a number. Null otherwise. Never throws.
   */
  hintForYes(text: Pick<InboundText, 'from' | 'twilioVerified'>): Promise<string | null>;
}

// ── Reading a text ──────────────────────────────────────────────────────────

/** What a coach's text asks for. Creating a page by text comes in a later update. */
export type Intent =
  | { action: 'menu' }
  | { action: 'live' }
  | { action: 'games' }
  | { action: 'attach'; offerNewPage: boolean }
  | { action: 'undo' }
  | { action: 'unlink' };

export interface ICommandInterpreter {
  /** Null when the text is not understood. */
  interpret(body: string): Promise<Intent | null>;
}

/** Whether a word is a game keyword a viewer could text. */
export interface IKeywordLookup {
  isKeyword(word: string): Promise<boolean>;
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

/** One phone on one login's list. */
export interface CoachTextLinkRecord {
  id: string;
  ownerUserId: string;
  /** The number typed in the portal. Proven once `verifiedAt` is set. */
  phoneE164: string;
  /** The person's name, e.g. Jordan. */
  label: string;
  verifiedAt: Date | null;
  lastCommandAt: Date | null;
  /** Set while the phone has texted STOP. */
  pausedAt: Date | null;
  /** Set while a code waits for this phone's LINK text. */
  codeHash: string | null;
  codeExpiresAt: Date | null;
  /** Wrong codes texted from this phone since the code was made. */
  codeAttempts: number;
  owner: CoachTextOwner;
}

export interface ICoachTextLinkReader {
  findById(id: string): Promise<CoachTextLinkRecord | null>;
  /** The login's phones, oldest first. */
  listByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord[]>;
  findByOwnerAndPhone(ownerUserId: string, phoneE164: string): Promise<CoachTextLinkRecord | null>;
  /** Every link that has proven this phone, on any login, oldest first. */
  findVerifiedByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]>;
  /** Every link holding a code for this phone, waiting for its LINK text. */
  findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]>;
  /** True when any login lists this phone. */
  isKnownPhone(phoneE164: string): Promise<boolean>;
}

export interface NewPhoneLinkInput {
  /** Made by the caller, because the code's hash is salted with it. */
  id: string;
  ownerUserId: string;
  phoneE164: string;
  label: string;
  codeHash: string;
  codeExpiresAt: Date;
}

export interface SetCodeInput {
  codeHash: string;
  codeExpiresAt: Date;
  /** Left as it is when not given. */
  label?: string;
}

export interface CompleteLinkInput {
  id: string;
  now: Date;
  /** Link the phone already paused (it had texted STOP before). */
  paused: boolean;
}

export interface ICoachTextLinkWriter {
  /** A new phone on the login's list, waiting for its LINK text. */
  create(input: NewPhoneLinkInput): Promise<void>;
  /** Stores a new code and sets the try count back to zero. */
  setCode(id: string, input: SetCodeInput): Promise<void>;
  addFailedAttempt(ids: string[]): Promise<void>;
  /** Marks this row's phone proven and clears its code. No other row changes. */
  complete(input: CompleteLinkInput): Promise<void>;
  delete(id: string): Promise<void>;
  /** Pauses or resumes every proven link of the phone. Answers whether there was one. */
  setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean>;
  /** The link acted on a text: it is not idle. */
  touchLastCommand(id: string, at: Date): Promise<void>;
}

// ── Settings per login ──────────────────────────────────────────────────────

export interface ICoachTextSettingsStore {
  /** Null when the login never picked one. */
  getTimeZone(ownerUserId: string): Promise<string | null>;
  setTimeZone(ownerUserId: string, timeZone: string): Promise<void>;
}

// ── Conversation per phone ──────────────────────────────────────────────────

/** What a phone is in the middle of, shared by all its links. */
export interface CoachTextConversation {
  phoneE164: string;
  /** The link (so the account) the phone texts for, while `chosenUntil` lasts. */
  chosenLinkId: string | null;
  chosenUntil: Date | null;
  pendingId: string | null;
  /** As stored. Checked with `CoachTextQuestionSchema` before use. */
  pendingQuestion: unknown;
  pendingExpiresAt: Date | null;
}

export interface AskQuestionInput {
  pendingId: string;
  question: CoachTextQuestion;
  expiresAt: Date;
}

export interface AnswerQuestionInput {
  /** The question being answered. Another one asked since means this answer lost. */
  pendingId: string;
  now: Date;
  /** The account choice the answer makes, written in the same update. */
  choose?: { linkId: string; until: Date };
}

export interface ICoachTextConversationStore {
  get(phoneE164: string): Promise<CoachTextConversation | null>;
  /** Opens a question, replacing any question still open. */
  ask(phoneE164: string, input: AskQuestionInput): Promise<void>;
  /**
   * Closes the question if it is still the one asked and has not run out, and
   * records the choice with it. False when another answer won or it ran out.
   */
  answer(phoneE164: string, input: AnswerQuestionInput): Promise<boolean>;
  /**
   * Takes the phone's lease until `until` when no other text holds it (its lease
   * is unset or ended before `now`). False when another text holds it.
   */
  acquireLease(phoneE164: string, now: Date, until: Date): Promise<boolean>;
  /** Gives the lease back, only if it is still the one taken with `until`. */
  releaseLease(phoneE164: string, until: Date): Promise<void>;
}

// ── Choosing the account a phone texts for ──────────────────────────────────

/** A link that can act now: proven, not paused, not idle, its login and account allowed. */
export interface LiveLink {
  linkId: string;
  ownerUserId: string;
  ownerAccountId: string;
  accountName: string;
  /** The phone's name on this link. */
  label: string;
}

export type AccountResolution =
  | { kind: 'none' }
  | { kind: 'one'; link: LiveLink }
  | { kind: 'chosen'; link: LiveLink }
  | { kind: 'ask'; options: LiveLink[] };

export interface IAccountChooser {
  /** The phone's live links, oldest first. */
  listLive(phoneE164: string): Promise<LiveLink[]>;
  /** The account a text from this phone is for, or that the bot has to ask. */
  resolve(phoneE164: string): Promise<AccountResolution>;
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
  /** What the text did: menu, live, games, attach, undo, unlink, account, answer. */
  action?: string;
  reason?: string;
  replyText?: string | null;
  latencyMs?: number;
  ownerUserId?: string;
  ownerAccountId?: string;
  /** The sending phone's name on the link the text acted for. */
  phoneLabel?: string;
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
  phoneLabel: string | null;
}

/** The text a phone sent before this one, as far as the log knows it. */
export interface PreviousCommand {
  status: string;
  reason: string | null;
}

export interface ICoachTextCommandReader {
  countUnverifiedSince(phoneE164: string, since: Date): Promise<number>;
  /**
   * The phone's latest verified text from before the text `beforeId`. A text
   * turned away because another was running does not count.
   */
  previousFor(phoneE164: string, beforeId: string): Promise<PreviousCommand | null>;
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
    label: string;
    phoneMasked: string;
    paused: boolean;
  }): Promise<void>;
  removed(input: { email: string; accountName: string; label: string; phoneMasked: string }): Promise<void>;
}

// ── Linking ─────────────────────────────────────────────────────────────────

export interface AddPhoneInput {
  ownerUserId: string;
  /** The person's name, already checked by the schema. */
  label: string;
  /** As typed. US and Canadian numbers only. */
  phone: string;
  /** The browser's zone, kept only while the login has not picked one. */
  timeZone?: string;
}

export interface IssuedCode {
  /** The phone's row on the login's list. */
  id: string;
  /** Six digits. Returned once and never stored or logged. */
  code: string;
  codeExpiresAt: Date;
}

/** What a login may see about one of its phones: a masked number, never a code. */
export interface CoachTextPhoneView {
  id: string;
  label: string;
  phoneMasked: string;
  state: CoachTextPhoneState;
  codeExpiresAt: Date | null;
  verifiedAt: Date | null;
  lastCommandAt: Date | null;
  /** A text came from this number while its code waited but could not be verified. */
  unverifiedTextSeen: boolean;
}

export interface CoachTextPortalStatus {
  timeZone: string;
  phones: CoachTextPhoneView[];
}

/** Why a LINK text did not link. Kept in the log; the texter sees one answer. */
export type LinkRefusal =
  | 'no_pending'
  | 'expired'
  | 'too_many_tries'
  | 'wrong_code'
  | 'not_allowed'
  | 'too_many_accounts';

export type LinkCompletion =
  | { matched: false; reason: LinkRefusal }
  | {
      matched: true;
      linkId: string;
      ownerUserId: string;
      ownerAccountId: string;
      accountName: string;
      label: string;
      /** The phone had texted STOP, so FieldView cannot reply to it. */
      paused: boolean;
      /** Accounts the phone works with now, this one included. */
      accountCount: number;
    };

/** What the owner portal needs. Every call is for the login's own phones only. */
export interface IPhoneLinkPortal {
  addPhone(input: AddPhoneInput): Promise<IssuedCode>;
  newCode(ownerUserId: string, linkId: string): Promise<IssuedCode>;
  getStatus(ownerUserId: string): Promise<CoachTextPortalStatus>;
  setTimeZone(ownerUserId: string, timeZone: string): Promise<void>;
  removePhone(ownerUserId: string, linkId: string): Promise<{ removed: boolean }>;
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

// ── Games and streams ───────────────────────────────────────────────────────

/** One game page (a DirectStreamEvent) of the coach's account. */
export interface CoachGame {
  eventId: string;
  directStreamId: string;
  title: string;
  parentSlug: string;
  eventSlug: string;
  scheduledStartAt: Date | null;
  streamUrl: string | null;
}

/** The account's pages. Every read is scoped to the account, and to active pages and parents. */
export interface IGameReader {
  /** Starting between 3 hours ago and 60 minutes from now, soonest first. */
  listOnNow(ownerAccountId: string, now: Date): Promise<CoachGame[]>;
  /** On now or starting within the next `hours`, soonest first, at most `limit`. */
  listUpcoming(ownerAccountId: string, now: Date, hours: number, limit: number): Promise<CoachGame[]>;
  /** The pages whose start is nearest to now, before or after, at most `limit`. */
  listNearest(ownerAccountId: string, now: Date, limit: number): Promise<CoachGame[]>;
}

/** "What is live on this account's cameras?", with a short reuse so a second text is instant. */
export interface ILiveLookup {
  find(ownerAccountId: string): Promise<OwnerLiveStreams>;
}

export type { LiveStream, OwnerLiveStreams };

// ── Changing a stream ───────────────────────────────────────────────────────

/** Where a page lives, for the reply. */
export interface AttachedPage {
  title: string;
  parentSlug: string;
  eventSlug: string;
}

export interface AttachWrite {
  /** The log row of this text. It records what changed, for UNDO. */
  commandId: string;
  ownerUserId: string;
  /** Read from the login on this text. The write is scoped to it. */
  ownerAccountId: string;
  eventId: string;
  streamUrl: string;
  phoneE164: string;
  /** The open question this answers. Consumed in the same transaction. */
  pendingId: string | null;
  now: Date;
  /** No write starts after this moment, in milliseconds. */
  deadlineAtMs: number;
}

export type AttachResult =
  | { kind: 'attached'; page: AttachedPage }
  | { kind: 'same'; page: AttachedPage }
  /** Not one of the account's active pages any more. */
  | { kind: 'not_found' }
  /** Another answer, or a new question, closed it first. */
  | { kind: 'question_closed' }
  /** The page changed between the read and the write. Nothing was written. */
  | { kind: 'changed' }
  /** The reply window ran out. Nothing was written. */
  | { kind: 'late' };

export interface UndoWrite {
  commandId: string;
  ownerUserId: string;
  ownerAccountId: string;
  now: Date;
  deadlineAtMs: number;
}

export type UndoResult =
  | { kind: 'undone'; page: AttachedPage }
  /** No change by text on this account in the window, or it was undone already. */
  | { kind: 'nothing' }
  /** Someone changed the page after the text, so it was left alone. */
  | { kind: 'changed'; page: AttachedPage }
  | { kind: 'late' };

export interface IAttachWriter {
  /** Puts the stream on the page and pins it. */
  attach(input: AttachWrite): Promise<AttachResult>;
  /** Puts back the URL and the pin the account's last change by text replaced, within 30 minutes. */
  undo(input: UndoWrite): Promise<UndoResult>;
}
