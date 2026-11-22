/**
 * In-memory stand-ins for the coach text stores. Test use only.
 */

import type {
  BeginCommandInput,
  CoachTextCommandStatus,
  CoachTextConsentInput,
  CoachTextHistoryRow,
  CoachTextInterpreter,
  CoachTextLinkRecord,
  CoachTextOwner,
  CompleteLinkInput,
  FinishCommandInput,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  ICoachTextConsent,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  ICoachTextNotifier,
  SetPendingLinkInput,
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

export class FakeLinkStore implements ICoachTextLinkReader, ICoachTextLinkWriter {
  readonly owners = new Map<string, CoachTextOwner>();
  readonly rows = new Map<string, StoredLink>();
  /** When set, the next read or write throws it once. */
  failNext: Error | null = null;
  private nextId = 1;

  addOwner(owner: CoachTextOwner): CoachTextOwner {
    this.owners.set(owner.ownerUserId, owner);
    return owner;
  }

  /** The stored row for a login, for assertions. */
  rowFor(ownerUserId: string): StoredLink | undefined {
    return [...this.rows.values()].find((row) => row.ownerUserId === ownerUserId);
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

  findByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord | null> {
    this.check();
    const row = this.rowFor(ownerUserId);
    return Promise.resolve(row ? this.toRecord(row) : null);
  }

  findByPhone(phoneE164: string): Promise<CoachTextLinkRecord | null> {
    this.check();
    const row = [...this.rows.values()].find((candidate) => candidate.phoneE164 === phoneE164);
    return Promise.resolve(row ? this.toRecord(row) : null);
  }

  findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    this.check();
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.pendingPhoneE164 === phoneE164)
        .map((row) => this.toRecord(row))
    );
  }

  isKnownPhone(phoneE164: string): Promise<boolean> {
    this.check();
    return Promise.resolve(
      [...this.rows.values()].some(
        (row) => row.phoneE164 === phoneE164 || row.pendingPhoneE164 === phoneE164
      )
    );
  }

  ensure(ownerUserId: string): Promise<CoachTextLinkRecord> {
    this.check();
    const existing = this.rowFor(ownerUserId);
    if (existing) {
      return Promise.resolve(this.toRecord(existing));
    }
    const row: StoredLink = {
      id: `link-${this.nextId++}`,
      ownerUserId,
      phoneE164: null,
      verifiedAt: null,
      lastCommandAt: null,
      pausedAt: null,
      pendingPhoneE164: null,
      codeHash: null,
      codeExpiresAt: null,
      codeAttempts: 0,
      timeZone: null,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(this.toRecord(row));
  }

  setPending(id: string, input: SetPendingLinkInput): Promise<void> {
    this.check();
    const row = this.mustGet(id);
    row.pendingPhoneE164 = input.pendingPhoneE164;
    row.codeHash = input.codeHash;
    row.codeExpiresAt = input.codeExpiresAt;
    row.codeAttempts = 0;
    if (input.timeZone) {
      row.timeZone = input.timeZone;
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
    for (const other of this.rows.values()) {
      if (other.id !== input.id && other.phoneE164 === input.phoneE164) {
        other.phoneE164 = null;
        other.verifiedAt = null;
        other.lastCommandAt = null;
        other.pausedAt = null;
      }
    }
    const row = this.mustGet(input.id);
    row.phoneE164 = input.phoneE164;
    row.verifiedAt = input.now;
    row.lastCommandAt = input.now;
    row.pausedAt = input.paused ? input.now : null;
    row.pendingPhoneE164 = null;
    row.codeHash = null;
    row.codeExpiresAt = null;
    row.codeAttempts = 0;
    return Promise.resolve();
  }

  setTimeZone(id: string, timeZone: string): Promise<void> {
    this.check();
    this.mustGet(id).timeZone = timeZone;
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.check();
    this.rows.delete(id);
    return Promise.resolve();
  }

  setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean> {
    this.check();
    const row = [...this.rows.values()].find((candidate) => candidate.phoneE164 === phoneE164);
    if (!row) {
      return Promise.resolve(false);
    }
    row.pausedAt = pausedAt;
    return Promise.resolve(true);
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
  reason: string | null;
  replyText: string | null;
  latencyMs: number | null;
  ownerUserId: string | null;
  ownerAccountId: string | null;
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
      reason: null,
      replyText: null,
      latencyMs: null,
      ownerUserId: null,
      ownerAccountId: null,
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
    row.reason = input.reason ?? null;
    row.replyText = input.replyText ?? null;
    row.latencyMs = input.latencyMs ?? null;
    row.ownerUserId = input.ownerUserId ?? null;
    row.ownerAccountId = input.ownerAccountId ?? null;
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
      reason: input.reason,
      replyText: null,
      latencyMs: null,
      ownerUserId: null,
      ownerAccountId: null,
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
        }))
    );
  }
}

export type SentNotice =
  | { kind: 'linked'; email: string; accountName: string; phoneMasked: string; paused: boolean }
  | { kind: 'movedAway'; email: string; phoneMasked: string }
  | { kind: 'unlinked'; email: string; accountName: string; phoneMasked: string };

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
    phoneMasked: string;
    paused: boolean;
  }): Promise<void> {
    return this.push({ kind: 'linked', ...input });
  }

  movedAway(input: { email: string; phoneMasked: string }): Promise<void> {
    return this.push({ kind: 'movedAway', ...input });
  }

  unlinked(input: { email: string; accountName: string; phoneMasked: string }): Promise<void> {
    return this.push({ kind: 'unlinked', ...input });
  }
}
