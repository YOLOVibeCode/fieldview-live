/**
 * Coach text commands: what each phone is in the middle of, on Prisma.
 *
 * One row per phone, shared by all its links: the account it texts for, its
 * one open question and its lease. Answering and taking the lease are single
 * conditional updates, so two texts racing for either cannot both win.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

import type {
  AnswerQuestionInput,
  AskQuestionInput,
  CoachTextConversation,
  ICoachTextConversationStore,
} from './interfaces';

export class PrismaConversationStore implements ICoachTextConversationStore {
  constructor(private readonly prisma: PrismaClient) {}

  async get(phoneE164: string): Promise<CoachTextConversation | null> {
    const row = await this.prisma.coachTextPhone.findUnique({ where: { phoneE164 } });
    if (!row) {
      return null;
    }
    return {
      phoneE164: row.phoneE164,
      chosenLinkId: row.chosenLinkId,
      chosenUntil: row.chosenUntil,
      pendingId: row.pendingId,
      pendingQuestion: row.pendingQuestion,
      pendingExpiresAt: row.pendingExpiresAt,
    };
  }

  async ask(phoneE164: string, input: AskQuestionInput): Promise<void> {
    const question = input.question as unknown as Prisma.InputJsonValue;
    await this.prisma.coachTextPhone.upsert({
      where: { phoneE164 },
      create: {
        phoneE164,
        pendingId: input.pendingId,
        pendingQuestion: question,
        pendingExpiresAt: input.expiresAt,
      },
      update: {
        pendingId: input.pendingId,
        pendingQuestion: question,
        pendingExpiresAt: input.expiresAt,
      },
    });
  }

  async answer(phoneE164: string, input: AnswerQuestionInput): Promise<boolean> {
    const result = await this.prisma.coachTextPhone.updateMany({
      where: { phoneE164, pendingId: input.pendingId, pendingExpiresAt: { gt: input.now } },
      data: {
        pendingId: null,
        pendingQuestion: Prisma.DbNull,
        pendingExpiresAt: null,
        ...(input.choose
          ? { chosenLinkId: input.choose.linkId, chosenUntil: input.choose.until }
          : {}),
      },
    });
    return result.count === 1;
  }

  async acquireLease(phoneE164: string, now: Date, until: Date): Promise<boolean> {
    // The row may not exist yet; making it is harmless when it does.
    await this.prisma.coachTextPhone.createMany({ data: [{ phoneE164 }], skipDuplicates: true });
    const result = await this.prisma.coachTextPhone.updateMany({
      where: { phoneE164, OR: [{ busyUntil: null }, { busyUntil: { lte: now } }] },
      data: { busyUntil: until },
    });
    return result.count === 1;
  }

  async releaseLease(phoneE164: string, until: Date): Promise<void> {
    await this.prisma.coachTextPhone.updateMany({
      where: { phoneE164, busyUntil: until },
      data: { busyUntil: null },
    });
  }
}
