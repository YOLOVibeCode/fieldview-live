/**
 * Coach text commands: the link store, on Prisma.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  CoachTextLinkRecord,
  CompleteLinkInput,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  SetPendingLinkInput,
} from './interfaces';

const WITH_OWNER = { ownerUser: { include: { ownerAccount: true } } } as const;

type LinkRow = Prisma.CoachTextLinkGetPayload<{ include: typeof WITH_OWNER }>;

function toRecord(row: LinkRow): CoachTextLinkRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    phoneE164: row.phoneE164,
    verifiedAt: row.verifiedAt,
    lastCommandAt: row.lastCommandAt,
    pausedAt: row.pausedAt,
    pendingPhoneE164: row.pendingPhoneE164,
    codeHash: row.codeHash,
    codeExpiresAt: row.codeExpiresAt,
    codeAttempts: row.codeAttempts,
    timeZone: row.timeZone,
    owner: {
      ownerUserId: row.ownerUser.id,
      email: row.ownerUser.email,
      loginStatus: row.ownerUser.status,
      ownerAccountId: row.ownerUser.ownerAccountId,
      accountName: row.ownerUser.ownerAccount.name,
      accountStatus: row.ownerUser.ownerAccount.status,
      accountSuspended: row.ownerUser.ownerAccount.isSuspended,
    },
  };
}

export class PrismaLinkRepository implements ICoachTextLinkReader, ICoachTextLinkWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async findByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord | null> {
    const row = await this.prisma.coachTextLink.findUnique({
      where: { ownerUserId },
      include: WITH_OWNER,
    });
    return row ? toRecord(row) : null;
  }

  async findByPhone(phoneE164: string): Promise<CoachTextLinkRecord | null> {
    const row = await this.prisma.coachTextLink.findUnique({
      where: { phoneE164 },
      include: WITH_OWNER,
    });
    return row ? toRecord(row) : null;
  }

  async findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    const rows = await this.prisma.coachTextLink.findMany({
      where: { pendingPhoneE164: phoneE164 },
      include: WITH_OWNER,
    });
    return rows.map(toRecord);
  }

  async isKnownPhone(phoneE164: string): Promise<boolean> {
    const count = await this.prisma.coachTextLink.count({
      where: { OR: [{ phoneE164 }, { pendingPhoneE164: phoneE164 }] },
    });
    return count > 0;
  }

  async ensure(ownerUserId: string): Promise<CoachTextLinkRecord> {
    const row = await this.prisma.coachTextLink.upsert({
      where: { ownerUserId },
      create: { ownerUserId },
      update: {},
      include: WITH_OWNER,
    });
    return toRecord(row);
  }

  async setPending(id: string, input: SetPendingLinkInput): Promise<void> {
    await this.prisma.coachTextLink.update({
      where: { id },
      data: {
        pendingPhoneE164: input.pendingPhoneE164,
        codeHash: input.codeHash,
        codeExpiresAt: input.codeExpiresAt,
        codeAttempts: 0,
        ...(input.timeZone ? { timeZone: input.timeZone } : {}),
      },
    });
  }

  async addFailedAttempt(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.prisma.coachTextLink.updateMany({
      where: { id: { in: ids } },
      data: { codeAttempts: { increment: 1 } },
    });
  }

  /**
   * The phone column is unique, so the phone is taken from its earlier login
   * first and given to this one second, in one transaction.
   */
  async complete(input: CompleteLinkInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.coachTextLink.updateMany({
        where: { phoneE164: input.phoneE164, NOT: { id: input.id } },
        data: {
          phoneE164: null,
          verifiedAt: null,
          lastCommandAt: null,
          pausedAt: null,
          pendingId: null,
          pendingExpiresAt: null,
          busyUntil: null,
        },
      }),
      this.prisma.coachTextLink.update({
        where: { id: input.id },
        data: {
          phoneE164: input.phoneE164,
          verifiedAt: input.now,
          lastCommandAt: input.now,
          pausedAt: input.paused ? input.now : null,
          pendingPhoneE164: null,
          codeHash: null,
          codeExpiresAt: null,
          codeAttempts: 0,
          pendingId: null,
          pendingExpiresAt: null,
          busyUntil: null,
        },
      }),
    ]);
  }

  async setTimeZone(id: string, timeZone: string): Promise<void> {
    await this.prisma.coachTextLink.update({ where: { id }, data: { timeZone } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.coachTextLink.deleteMany({ where: { id } });
  }

  async setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean> {
    const result = await this.prisma.coachTextLink.updateMany({
      where: { phoneE164 },
      data: { pausedAt },
    });
    return result.count > 0;
  }
}
