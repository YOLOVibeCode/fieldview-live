/**
 * Coach text commands: settings per owner login, on Prisma.
 */

import type { PrismaClient } from '@prisma/client';

import type { ICoachTextSettingsStore } from './interfaces';

export class PrismaSettingsStore implements ICoachTextSettingsStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getTimeZone(ownerUserId: string): Promise<string | null> {
    const row = await this.prisma.coachTextSettings.findUnique({
      where: { ownerUserId },
      select: { timeZone: true },
    });
    return row?.timeZone ?? null;
  }

  async setTimeZone(ownerUserId: string, timeZone: string): Promise<void> {
    await this.prisma.coachTextSettings.upsert({
      where: { ownerUserId },
      create: { ownerUserId, timeZone },
      update: { timeZone },
    });
  }
}
