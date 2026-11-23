/**
 * In-memory stand-ins for the coach text stores. Test use only.
 */

import type { OwnerLiveStreams } from '../../camera-sources/interfaces';
import type {
  AnswerQuestionInput,
  AskQuestionInput,
  AttachResult,
  AttachWrite,
  AttachedPage,
  CoachGame,
  BeginCommandInput,
  CoachTextCommandStatus,
  CoachTextConsentInput,
  CoachTextConversation,
  CoachTextHistoryRow,
  CoachTextInterpreter,
  CoachTextLinkRecord,
  CoachTextOwner,
  CompleteLinkInput,
  FinishCommandInput,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  ICoachTextConsent,
  ICoachTextConversationStore,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  ICoachTextNotifier,
  ICoachTextSettingsStore,
  IAttachWriter,
  IGameReader,
  IKeywordLookup,
  ILiveLookup,
  NewPhoneLinkInput,
  PreviousCommand,
  SetCodeInput,
  UndoResult,
  UndoWrite,
  UnverifiedTextInput,
} from '../interfaces';

export function makeOwner(overrides: Partial<CoachTextOwner> = {}): CoachTextOwner {
  return {
    ownerUserId: 'user-1',
    email: 'coach@example.com',
    loginStatus: 'active',
    ownerAccountId: 'account-1',
    accountName: 'Diablos FC',
    accountStatus: 'pending_verification',
    accountSuspended: false,
    ...overrides,
  };
}

type StoredLink = Omit<CoachTextLinkRecord, 'owner'>;

export interface SeedLinkInput {
  id?: string;
  ownerUserId: string;
  phoneE164: string;
  label?: string;
  verifiedAt?: Date | null;
  lastCommandAt?: Date | null;
  pausedAt?: Date | null;
}

export class FakeLinkStore implements ICoachTextLinkReader, ICoachTextLinkWriter {
  readonly owners = new Map<string, CoachTextOwner>();
  readonly rows = new Map<string, StoredLink>();
  /** When set, the next read or write throws it once. */
  failNext: Error | null = null;
  /** The order rows were made in, so lists come back oldest first. */
  private readonly order = new Map<string, number>();
  private seq = 1;

  private put(row: StoredLink): StoredLink {
    this.rows.set(row.id, row);
    this.order.set(row.id, this.seq++);
    return row;
  }

  private byAge(a: StoredLink, b: StoredLink): number {
    return (this.order.get(a.id) ?? 0) - (this.order.get(b.id) ?? 0);
  }

  addOwner(owner: CoachTextOwner): CoachTextOwner {
    this.owners.set(owner.ownerUserId, owner);
    return owner;
  }

  /** Puts a phone on a login's list directly, proven unless `verifiedAt` is null. */
  seed(input: SeedLinkInput): StoredLink {
    const now = new Date('2026-11-21T12:00:00.000Z');
    return this.put({
      id: input.id ?? `link-${this.seq}`,
      ownerUserId: input.ownerUserId,
      phoneE164: input.phoneE164,
      label: input.label ?? 'Phone',
      verifiedAt: input.verifiedAt === undefined ? now : input.verifiedAt,
      lastCommandAt: input.lastCommandAt === undefined ? now : input.lastCommandAt,
      pausedAt: input.pausedAt ?? null,
      codeHash: null,
      codeExpiresAt: null,
      codeAttempts: 0,
    });
  }

  /** The stored rows of a login, oldest first, for assertions. */
  rowsFor(ownerUserId: string): StoredLink[] {
    return [...this.rows.values()]
      .filter((row) => row.ownerUserId === ownerUserId)
      .sort((a, b) => this.byAge(a, b));
  }

  private check(): void {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }

  private toRecord(row: StoredLink): CoachTextLinkRecord {
    const owner = this.owners.get(row.ownerUserId);
    if (!owner) {
      throw new Error(`no owner ${row.ownerUserId}`);
    }
    return { ...row, owner: { ...owner } };
  }

  private mustGet(id: string): StoredLink {
    const row = this.rows.get(id);
    if (!row) {
      throw new Error(`no link ${id}`);
    }
    return row;
  }

  private sorted(filter: (row: StoredLink) => boolean): CoachTextLinkRecord[] {
    return [...this.rows.values()]
      .filter(filter)
      .sort((a, b) => this.byAge(a, b))
      .map((row) => this.toRecord(row));
  }

  findById(id: string): Promise<CoachTextLinkRecord | null> {
    this.check();
    const row = this.rows.get(id);
    return Promise.resolve(row ? this.toRecord(row) : null);
  }

  listByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord[]> {
    this.check();
    return Promise.resolve(this.sorted((row) => row.ownerUserId === ownerUserId));
  }

  findByOwnerAndPhone(ownerUserId: string, phoneE164: string): Promise<CoachTextLinkRecord | null> {
    this.check();
    const [row] = this.sorted((candidate) => candidate.ownerUserId === ownerUserId && candidate.phoneE164 === phoneE164);
    return Promise.resolve(row ?? null);
  }

  findVerifiedByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    this.check();
    return Promise.resolve(this.sorted((row) => row.phoneE164 === phoneE164 && row.verifiedAt !== null));
  }

  findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    this.check();
    return Promise.resolve(this.sorted((row) => row.phoneE164 === phoneE164 && row.codeHash !== null));
  }

  isKnownPhone(phoneE164: string): Promise<boolean> {
    this.check();
    return Promise.resolve([...this.rows.values()].some((row) => row.phoneE164 === phoneE164));
  }

  create(input: NewPhoneLinkInput): Promise<void> {
    this.check();
    const taken = [...this.rows.values()].some(
      (row) => row.ownerUserId === input.ownerUserId && row.phoneE164 === input.phoneE164
    );
    if (taken) {
      return Promise.reject(new Error('unique (ownerUserId, phoneE164)'));
    }
    this.put({
      id: input.id,
      ownerUserId: input.ownerUserId,
      phoneE164: input.phoneE164,
      label: input.label,
      verifiedAt: null,
      lastCommandAt: null,
      pausedAt: null,
      codeHash: input.codeHash,
      codeExpiresAt: input.codeExpiresAt,
      codeAttempts: 0,
    });
    return Promise.resolve();
  }

  setCode(id: string, input: SetCodeInput): Promise<void> {
    this.check();
    const row = this.mustGet(id);
    row.codeHash = input.codeHash;
    row.codeExpiresAt = input.codeExpiresAt;
    row.codeAttempts = 0;
    if (input.label !== undefined) {
      row.label = input.label;
    }
    return Promise.resolve();
  }

  addFailedAttempt(ids: string[]): Promise<void> {
    this.check();
    for (const id of ids) {
      this.mustGet(id).codeAttempts += 1;
    }
    return Promise.resolve();
  }

  complete(input: CompleteLinkInput): Promise<void> {
    this.check();
    const row = this.mustGet(input.id);
    row.verifiedAt = input.now;
    row.lastCommandAt = input.now;
    row.pausedAt = input.paused ? input.now : null;
    row.codeHash = null;
    row.codeExpiresAt = null;
    row.codeAttempts = 0;
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.check();
    this.rows.delete(id);
    return Promise.resolve();
  }

  touchLastCommand(id: string, at: Date): Promise<void> {
    this.check();
    const row = this.rows.get(id);
    if (row) {
      row.lastCommandAt = at;
    }
    return Promise.resolve();
  }

  setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean> {
    this.check();
    const held = [...this.rows.values()].filter(
      (row) => row.phoneE164 === phoneE164 && row.verifiedAt !== null
    );
    for (const row of held) {
      row.pausedAt = pausedAt;
    }
    return Promise.resolve(held.length > 0);
  }
}

export class FakeSettingsStore implements ICoachTextSettingsStore {
  readonly zones = new Map<string, string>();

  getTimeZone(ownerUserId: string): Promise<string | null> {
    return Promise.resolve(this.zones.get(ownerUserId) ?? null);
  }

  setTimeZone(ownerUserId: string, timeZone: string): Promise<void> {
    this.zones.set(ownerUserId, timeZone);
    return Promise.resolve();
  }
}

export class FakeConversationStore implements ICoachTextConversationStore {
  readonly rows = new Map<string, CoachTextConversation>();
  /** Each phone's lease end. */
  readonly leases = new Map<string, Date>();
  /** When set, a lease is always granted, so a test can race two answers past it. */
  ignoreLeases = false;

  private row(phoneE164: string): CoachTextConversation {
    const existing = this.rows.get(phoneE164);
    if (existing) {
      return existing;
    }
    const created: CoachTextConversation = {
      phoneE164,
      chosenLinkId: null,
      chosenUntil: null,
      pendingId: null,
      pendingQuestion: null,
      pendingExpiresAt: null,
    };
    this.rows.set(phoneE164, created);
    return created;
  }

  /** Sets the phone's account choice directly. */
  choose(phoneE164: string, linkId: string, until: Date): void {
    const row = this.row(phoneE164);
    row.chosenLinkId = linkId;
    row.chosenUntil = until;
  }

  get(phoneE164: string): Promise<CoachTextConversation | null> {
    const row = this.rows.get(phoneE164);
    return Promise.resolve(row ? { ...row } : null);
  }

  ask(phoneE164: string, input: AskQuestionInput): Promise<void> {
    const row = this.row(phoneE164);
    row.pendingId = input.pendingId;
    row.pendingQuestion = JSON.parse(JSON.stringify(input.question)) as unknown;
    row.pendingExpiresAt = input.expiresAt;
    return Promise.resolve();
  }

  answer(phoneE164: string, input: AnswerQuestionInput): Promise<boolean> {
    const row = this.rows.get(phoneE164);
    if (
      !row ||
      row.pendingId !== input.pendingId ||
      !row.pendingExpiresAt ||
      row.pendingExpiresAt.getTime() <= input.now.getTime()
    ) {
      return Promise.resolve(false);
    }
    row.pendingId = null;
    row.pendingQuestion = null;
    row.pendingExpiresAt = null;
    if (input.choose) {
      row.chosenLinkId = input.choose.linkId;
      row.chosenUntil = input.choose.until;
    }
    return Promise.resolve(true);
  }

  acquireLease(phoneE164: string, now: Date, until: Date): Promise<boolean> {
    const held = this.leases.get(phoneE164);
    if (!this.ignoreLeases && held && held.getTime() > now.getTime()) {
      return Promise.resolve(false);
    }
    this.leases.set(phoneE164, until);
    return Promise.resolve(true);
  }

  releaseLease(phoneE164: string, until: Date): Promise<void> {
    if (this.leases.get(phoneE164)?.getTime() === until.getTime()) {
      this.leases.delete(phoneE164);
    }
    return Promise.resolve();
  }
}

export interface StoredConsent {
  phoneE164: string;
  purpose: string;
  consentTextVersion: string;
  source: string;
  consentedAt: Date | null;
  revokedAt: Date | null;
}

export class FakeConsent implements ICoachTextConsent {
  readonly rows = new Map<string, StoredConsent>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  get(phoneE164: string, purpose: string): StoredConsent | undefined {
    return this.rows.get(`${phoneE164}|${purpose}`);
  }

  getByPhoneAndPurpose(phoneE164: string, purpose: string): Promise<StoredConsent | null> {
    return Promise.resolve(this.get(phoneE164, purpose) ?? null);
  }

  recordConsent(input: CoachTextConsentInput): Promise<unknown> {
    const row: StoredConsent = { ...input, consentedAt: this.now(), revokedAt: null };
    this.rows.set(`${input.phoneE164}|${input.purpose}`, row);
    return Promise.resolve(row);
  }

  revokeConsent(phoneE164: string, purpose: string): Promise<void> {
    const existing = this.get(phoneE164, purpose);
    if (existing) {
      existing.revokedAt = this.now();
    } else {
      this.rows.set(`${phoneE164}|${purpose}`, {
        phoneE164,
        purpose,
        consentTextVersion: '',
        source: 'inbound-stop',
        consentedAt: null,
        revokedAt: this.now(),
      });
    }
    return Promise.resolve();
  }

  clearRevocation(phoneE164: string, purpose: string): Promise<void> {
    const existing = this.get(phoneE164, purpose);
    if (existing) {
      existing.revokedAt = null;
    }
    return Promise.resolve();
  }
}

export interface StoredCommand {
  id: string;
  messageSid: string | null;
  phoneE164: string;
  twilioVerified: boolean;
  body: string;
  interpreter: CoachTextInterpreter;
  status: CoachTextCommandStatus;
  action: string | null;
  reason: string | null;
  replyText: string | null;
  latencyMs: number | null;
  ownerUserId: string | null;
  ownerAccountId: string | null;
  phoneLabel: string | null;
  createdAt: Date;
}

export class FakeCommandLog implements ICoachTextCommandWriter, ICoachTextCommandReader {
  readonly rows: StoredCommand[] = [];
  /** When set, the next `begin` throws it once. */
  failBegin: Error | null = null;
  /** When set, every `finish` throws it. */
  failFinish: Error | null = null;
  private nextId = 1;

  constructor(private readonly now: () => Date = () => new Date()) {}

  begin(input: BeginCommandInput): Promise<{ id: string } | 'duplicate'> {
    if (this.failBegin) {
      const error = this.failBegin;
      this.failBegin = null;
      return Promise.reject(error);
    }
    if (this.rows.some((row) => row.messageSid === input.messageSid)) {
      return Promise.resolve('duplicate');
    }
    const row: StoredCommand = {
      id: `command-${this.nextId++}`,
      messageSid: input.messageSid,
      phoneE164: input.phoneE164,
      twilioVerified: true,
      body: input.body,
      interpreter: input.interpreter,
      status: 'received',
      action: null,
      reason: null,
      replyText: null,
      latencyMs: null,
      ownerUserId: null,
      ownerAccountId: null,
      phoneLabel: null,
      createdAt: this.now(),
    };
    this.rows.push(row);
    return Promise.resolve({ id: row.id });
  }

  finish(id: string, input: FinishCommandInput): Promise<void> {
    if (this.failFinish) {
      return Promise.reject(this.failFinish);
    }
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) {
      return Promise.reject(new Error(`no command ${id}`));
    }
    row.status = input.status;
    if (input.action !== undefined) {
      row.action = input.action;
    }
    row.reason = input.reason ?? null;
    row.replyText = input.replyText ?? null;
    row.latencyMs = input.latencyMs ?? null;
    row.ownerUserId = input.ownerUserId ?? null;
    row.ownerAccountId = input.ownerAccountId ?? null;
    row.phoneLabel = input.phoneLabel ?? null;
    return Promise.resolve();
  }

  recordUnverified(input: UnverifiedTextInput): Promise<void> {
    this.rows.push({
      id: `command-${this.nextId++}`,
      messageSid: null,
      phoneE164: input.phoneE164,
      twilioVerified: input.twilioVerified,
      body: '[not verified]',
      interpreter: 'none',
      status: 'rejected',
      action: null,
      reason: input.reason,
      replyText: null,
      latencyMs: null,
      ownerUserId: null,
      ownerAccountId: null,
      phoneLabel: null,
      createdAt: this.now(),
    });
    return Promise.resolve();
  }

  countUnverifiedSince(phoneE164: string, since: Date): Promise<number> {
    return Promise.resolve(
      this.rows.filter(
        (row) =>
          row.phoneE164 === phoneE164 &&
          row.status === 'rejected' &&
          (row.reason === 'unverified' || row.reason === 'no_message_sid') &&
          row.createdAt.getTime() >= since.getTime()
      ).length
    );
  }

  previousFor(phoneE164: string, beforeId: string): Promise<PreviousCommand | null> {
    const at = this.rows.findIndex((row) => row.id === beforeId);
    const earlier = this.rows.slice(0, Math.max(0, at)).filter(
      (row) =>
        row.phoneE164 === phoneE164 &&
        row.messageSid !== null &&
        !(row.status === 'rejected' && row.reason === 'busy')
    );
    const last = earlier.at(-1);
    return Promise.resolve(last ? { status: last.status, reason: last.reason } : null);
  }

  listForOwnerUser(ownerUserId: string, limit: number): Promise<CoachTextHistoryRow[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.ownerUserId === ownerUserId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
        .map((row) => ({
          createdAt: row.createdAt,
          body: row.body,
          status: row.status,
          replyText: row.replyText,
          phoneLabel: row.phoneLabel,
        }))
    );
  }
}

export type SentNotice =
  | {
      kind: 'linked';
      email: string;
      accountName: string;
      label: string;
      phoneMasked: string;
      paused: boolean;
    }
  | { kind: 'removed'; email: string; accountName: string; label: string; phoneMasked: string };

export class FakeNotifier implements ICoachTextNotifier {
  readonly sent: SentNotice[] = [];
  /** When set, every notice fails with it. */
  failWith: Error | null = null;

  private push(notice: SentNotice): Promise<void> {
    if (this.failWith) {
      return Promise.reject(this.failWith);
    }
    this.sent.push(notice);
    return Promise.resolve();
  }

  linked(input: {
    email: string;
    accountName: string;
    label: string;
    phoneMasked: string;
    paused: boolean;
  }): Promise<void> {
    return this.push({ kind: 'linked', ...input });
  }

  removed(input: { email: string; accountName: string; label: string; phoneMasked: string }): Promise<void> {
    return this.push({ kind: 'removed', ...input });
  }
}

// ── Games, streams and the write ────────────────────────────────────────────

export interface StoredPage {
  game: CoachGame;
  ownerAccountId: string;
  active: boolean;
  pinnedAt: Date | null;
}

export interface StoredChange {
  commandId: string;
  ownerAccountId: string;
  eventId: string;
  previousUrl: string | null;
  previousPinnedAt: Date | null;
  newUrl: string;
  at: Date;
  undone: boolean;
}

const HOUR = 60 * 60 * 1000;

/** The account's pages, and the guarded write on them, in memory. */
export class FakePages implements IGameReader, IAttachWriter {
  readonly pages = new Map<string, StoredPage>();
  readonly changes: StoredChange[] = [];
  /** Runs inside the write, before the page changes, e.g. to move the clock. */
  duringWrite: (() => void) | null = null;

  constructor(
    private readonly conversations: FakeConversationStore,
    private readonly nowMs: () => number
  ) {}

  add(ownerAccountId: string, game: Partial<CoachGame> & { eventId: string; title: string }): StoredPage {
    const page: StoredPage = {
      game: {
        directStreamId: '99999999-9999-4999-8999-999999999999',
        parentSlug: 'diablos',
        eventSlug: game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        scheduledStartAt: new Date(this.nowMs()),
        streamUrl: null,
        ...game,
      },
      ownerAccountId,
      active: true,
      pinnedAt: null,
    };
    this.pages.set(game.eventId, page);
    return page;
  }

  private ofAccount(ownerAccountId: string): CoachGame[] {
    return [...this.pages.values()]
      .filter((page) => page.ownerAccountId === ownerAccountId && page.active && page.game.scheduledStartAt)
      .map((page) => ({ ...page.game }))
      .sort((a, b) => (a.scheduledStartAt?.getTime() ?? 0) - (b.scheduledStartAt?.getTime() ?? 0));
  }

  listOnNow(ownerAccountId: string, now: Date): Promise<CoachGame[]> {
    const from = now.getTime() - 3 * HOUR;
    const to = now.getTime() + HOUR;
    return Promise.resolve(
      this.ofAccount(ownerAccountId).filter((g) => {
        const at = g.scheduledStartAt?.getTime() ?? 0;
        return at >= from && at <= to;
      })
    );
  }

  listUpcoming(ownerAccountId: string, now: Date, hours: number, limit: number): Promise<CoachGame[]> {
    const from = now.getTime() - 3 * HOUR;
    const to = now.getTime() + hours * HOUR;
    return Promise.resolve(
      this.ofAccount(ownerAccountId)
        .filter((g) => {
          const at = g.scheduledStartAt?.getTime() ?? 0;
          return at >= from && at <= to;
        })
        .slice(0, limit)
    );
  }

  listNearest(ownerAccountId: string, now: Date, limit: number): Promise<CoachGame[]> {
    const distance = (g: CoachGame): number => Math.abs((g.scheduledStartAt?.getTime() ?? 0) - now.getTime());
    return Promise.resolve(this.ofAccount(ownerAccountId).sort((a, b) => distance(a) - distance(b)).slice(0, limit));
  }

  private pageOf(page: StoredPage): AttachedPage {
    return { title: page.game.title, parentSlug: page.game.parentSlug, eventSlug: page.game.eventSlug };
  }

  async attach(input: AttachWrite): Promise<AttachResult> {
    if (this.nowMs() >= input.deadlineAtMs) {
      return { kind: 'late' };
    }
    if (input.pendingId) {
      const won = await this.conversations.answer(input.phoneE164, { pendingId: input.pendingId, now: input.now });
      if (!won) {
        return { kind: 'question_closed' };
      }
    }
    const page = this.pages.get(input.eventId);
    if (!page || !page.active || page.ownerAccountId !== input.ownerAccountId) {
      return { kind: 'not_found' };
    }
    if (page.game.streamUrl === input.streamUrl) {
      return { kind: 'same', page: this.pageOf(page) };
    }
    this.duringWrite?.();
    if (this.nowMs() >= input.deadlineAtMs) {
      return { kind: 'late' };
    }
    this.changes.push({
      commandId: input.commandId,
      ownerAccountId: input.ownerAccountId,
      eventId: input.eventId,
      previousUrl: page.game.streamUrl,
      previousPinnedAt: page.pinnedAt,
      newUrl: input.streamUrl,
      at: input.now,
      undone: false,
    });
    page.game.streamUrl = input.streamUrl;
    page.pinnedAt = input.now;
    return { kind: 'attached', page: this.pageOf(page) };
  }

  undo(input: UndoWrite): Promise<UndoResult> {
    if (this.nowMs() >= input.deadlineAtMs) {
      return Promise.resolve({ kind: 'late' });
    }
    const last = this.changes
      .filter((c) => c.ownerAccountId === input.ownerAccountId && input.now.getTime() - c.at.getTime() <= 30 * 60 * 1000)
      .at(-1);
    const page = last ? this.pages.get(last.eventId) : undefined;
    if (!last || last.undone || !page) {
      return Promise.resolve({ kind: 'nothing' });
    }
    if (page.game.streamUrl !== last.newUrl) {
      return Promise.resolve({ kind: 'changed', page: this.pageOf(page) });
    }
    last.undone = true;
    page.game.streamUrl = last.previousUrl;
    page.pinnedAt = last.previousPinnedAt;
    return Promise.resolve({ kind: 'undone', page: this.pageOf(page) });
  }
}

/** What the cameras report, per account, with a switch to make a lookup hang. */
export class FakeLiveLookup implements ILiveLookup {
  readonly byAccount = new Map<string, OwnerLiveStreams>();
  hang = false;
  calls = 0;
  /** Runs when a lookup is made, e.g. to move the clock. */
  onFind: (() => void) | null = null;

  find(ownerAccountId: string): Promise<OwnerLiveStreams> {
    this.calls += 1;
    this.onFind?.();
    if (this.hang) {
      return new Promise<OwnerLiveStreams>(() => undefined);
    }
    return Promise.resolve(
      this.byAccount.get(ownerAccountId) ?? { streams: [], sources: [{ provider: 'veo', displayName: 'Veo', status: 'ok' }] }
    );
  }
}

export class FakeKeywords implements IKeywordLookup {
  readonly words = new Set<string>();

  isKeyword(word: string): Promise<boolean> {
    return Promise.resolve(this.words.has(word));
  }
}

/** The stores a command needs beyond the link stores, in memory. */
export function commandFakes(
  conversations: FakeConversationStore,
  clock: () => Date
): { pages: FakePages; lookup: FakeLiveLookup; keywords: FakeKeywords; games: FakePages; writer: FakePages } {
  const pages = new FakePages(conversations, () => clock().getTime());
  return { pages, lookup: new FakeLiveLookup(), keywords: new FakeKeywords(), games: pages, writer: pages };
}
