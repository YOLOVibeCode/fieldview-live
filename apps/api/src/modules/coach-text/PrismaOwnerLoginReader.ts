/**
 * Coach text commands: finds the login behind an owner session.
 *
 * The owner token names the account and the login's email. A phone belongs to
 * one login, so the portal routes look the login up by that email.
 */

import type { PrismaClient } from '@prisma/client';

import type { IOwnerLoginReader, OwnerLogin } from './interfaces';

export class PrismaOwnerLoginReader implements IOwnerLoginReader {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<OwnerLogin | null> {
    const row = await this.prisma.ownerUser.findUnique({
      where: { email },
      select: { id: true, ownerAccountId: true, email: true, status: true },
    });
    if (!row) {
      return null;
    }
    return {
      ownerUserId: row.id,
      ownerAccountId: row.ownerAccountId,
      email: row.email,
      status: row.status,
    };
  }
}
