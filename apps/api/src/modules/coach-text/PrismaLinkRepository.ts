/**
 * Coach text commands: the phone list store, on Prisma. One row per (login, phone).
 */

import { Prisma, type PrismaClient } from '@prisma/client';

import { AppError } from '../../lib/errors';

import type {
  CoachTextLinkRecord,
  CompleteLinkInput,
  ICoachTextLinkReader,
  ICoachTextLinkWriter,
  NewPhoneLinkInput,
  SetCodeInput,
} from './interfaces';

const WITH_OWNER = { ownerUser: { include: { ownerAccount: true } } } as const;

/** Oldest first, with a tie-break so the order never changes between reads. */
const OLDEST_FIRST = [{ createdAt: 'asc' }, { id: 'asc' }] satisfies Prisma.CoachTextLinkOrderByWithRelationInput[];

type LinkRow = Prisma.CoachTextLinkGetPayload<{ include: typeof WITH_OWNER }>;

function toRecord(row: LinkRow): CoachTextLinkRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    phoneE164: row.phoneE164,
    label: row.label,
    verifiedAt: row.verifiedAt,
    lastCommandAt: row.lastCommandAt,
    pausedAt: row.pausedAt,
    codeHash: row.codeHash,
    codeExpiresAt: row.codeExpiresAt,
    codeAttempts: row.codeAttempts,
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

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class PrismaLinkRepository implements ICoachTextLinkReader, ICoachTextLinkWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CoachTextLinkRecord | null> {
    const row = await this.prisma.coachTextLink.findUnique({ where: { id }, include: WITH_OWNER });
    return row ? toRecord(row) : null;
  }

  async listByOwnerUserId(ownerUserId: string): Promise<CoachTextLinkRecord[]> {
    const rows = await this.prisma.coachTextLink.findMany({
      where: { ownerUserId },
      include: WITH_OWNER,
      orderBy: OLDEST_FIRST,
    });
    return rows.map(toRecord);
  }

  async findByOwnerAndPhone(ownerUserId: string, phoneE164: string): Promise<CoachTextLinkRecord | null> {
    const row = await this.prisma.coachTextLink.findUnique({
      where: { ownerUserId_phoneE164: { ownerUserId, phoneE164 } },
      include: WITH_OWNER,
    });
    return row ? toRecord(row) : null;
  }

  async findVerifiedByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    const rows = await this.prisma.coachTextLink.findMany({
      where: { phoneE164, verifiedAt: { not: null } },
      include: WITH_OWNER,
      orderBy: OLDEST_FIRST,
    });
    return rows.map(toRecord);
  }

  async findPendingByPhone(phoneE164: string): Promise<CoachTextLinkRecord[]> {
    const rows = await this.prisma.coachTextLink.findMany({
      where: { phoneE164, codeHash: { not: null } },
      include: WITH_OWNER,
      orderBy: OLDEST_FIRST,
    });
    return rows.map(toRecord);
  }

  async isKnownPhone(phoneE164: string): Promise<boolean> {
    const count = await this.prisma.coachTextLink.count({ where: { phoneE164 } });
    return count > 0;
  }

  async create(input: NewPhoneLinkInput): Promise<void> {
    try {
      await this.prisma.coachTextLink.create({
        data: {
          id: input.id,
          ownerUserId: input.ownerUserId,
          phoneE164: input.phoneE164,
          label: input.label,
          codeHash: input.codeHash,
          codeExpiresAt: input.codeExpiresAt,
          codeAttempts: 0,
        },
      });
    } catch (error) {
      // Two adds of the same number at once: the second finds it already listed.
      if (isUniqueViolation(error)) {
        throw new AppError('PHONE_ALREADY_ADDED', 'This number is already on your list.', 409);
      }
      throw error;
    }
  }

  async setCode(id: string, input: SetCodeInput): Promise<void> {
    await this.prisma.coachTextLink.update({
      where: { id },
      data: {
        codeHash: input.codeHash,
        codeExpiresAt: input.codeExpiresAt,
        codeAttempts: 0,
        ...(input.label === undefined ? {} : { label: input.label }),
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

  async complete(input: CompleteLinkInput): Promise<void> {
    await this.prisma.coachTextLink.update({
      where: { id: input.id },
      data: {
        verifiedAt: input.now,
        lastCommandAt: input.now,
        pausedAt: input.paused ? input.now : null,
        codeHash: null,
        codeExpiresAt: null,
        codeAttempts: 0,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.coachTextLink.deleteMany({ where: { id } });
  }

  async setPausedByPhone(phoneE164: string, pausedAt: Date | null): Promise<boolean> {
    const result = await this.prisma.coachTextLink.updateMany({
      where: { phoneE164, verifiedAt: { not: null } },
      data: { pausedAt },
    });
    return result.count > 0;
  }
}
