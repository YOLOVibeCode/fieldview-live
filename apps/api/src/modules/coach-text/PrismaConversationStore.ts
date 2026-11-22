/**
 * Coach text commands: what each phone is in the middle of, on Prisma.
 *
 * One row per phone, shared by all its links: the account it texts for and its
 * one open question. Answering is a single conditional update, so two answers
 * racing for the same question cannot both win.
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
}
