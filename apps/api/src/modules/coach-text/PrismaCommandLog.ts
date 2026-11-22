/**
 * Coach text commands: the log of texts, on Prisma.
 *
 * One row per text. The id Twilio gives a text is unique here, which is how a
 * text delivered twice is acted on once.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  BeginCommandInput,
  CoachTextHistoryRow,
  FinishCommandInput,
  ICoachTextCommandReader,
  ICoachTextCommandWriter,
  UnverifiedTextInput,
} from './interfaces';

/** Kept in place of the body of a text that could not be trusted. */
const UNVERIFIED_BODY = '[not verified]';
const UNVERIFIED_REASONS = ['unverified', 'no_message_sid'];

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

export class PrismaCommandLog implements ICoachTextCommandWriter, ICoachTextCommandReader {
  constructor(private readonly prisma: PrismaClient) {}

  async begin(input: BeginCommandInput): Promise<{ id: string } | 'duplicate'> {
    try {
      const row = await this.prisma.coachTextCommand.create({
        data: {
          messageSid: input.messageSid,
          phoneE164: input.phoneE164,
          twilioVerified: true,
          body: input.body,
          interpreter: input.interpreter,
          status: 'received',
        },
        select: { id: true },
      });
      return { id: row.id };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'duplicate';
      }
      throw error;
    }
  }

  async finish(id: string, input: FinishCommandInput): Promise<void> {
    await this.prisma.coachTextCommand.update({
      where: { id },
      data: {
        status: input.status,
        reason: input.reason ?? null,
        replyText: input.replyText ?? null,
        latencyMs: input.latencyMs ?? null,
        ownerUserId: input.ownerUserId ?? null,
        ownerAccountId: input.ownerAccountId ?? null,
        phoneLabel: input.phoneLabel ?? null,
      },
    });
  }

  async recordUnverified(input: UnverifiedTextInput): Promise<void> {
    await this.prisma.coachTextCommand.create({
      data: {
        messageSid: null,
        phoneE164: input.phoneE164,
        twilioVerified: input.twilioVerified,
        body: UNVERIFIED_BODY,
        interpreter: 'none',
        status: 'rejected',
        reason: input.reason,
      },
    });
  }

  async countUnverifiedSince(phoneE164: string, since: Date): Promise<number> {
    return this.prisma.coachTextCommand.count({
      where: {
        phoneE164,
        status: 'rejected',
        reason: { in: UNVERIFIED_REASONS },
        createdAt: { gte: since },
      },
    });
  }

  async listForOwnerUser(ownerUserId: string, limit: number): Promise<CoachTextHistoryRow[]> {
    return this.prisma.coachTextCommand.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { createdAt: true, body: true, status: true, replyText: true, phoneLabel: true },
    });
  }
}
