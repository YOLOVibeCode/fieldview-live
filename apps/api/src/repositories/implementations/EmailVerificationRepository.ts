/**
 * EmailVerification Repository Implementation
 */

import { prisma } from '../../lib/prisma';
import type {
  IEmailVerificationReader,
  IEmailVerificationWriter,
  CreateTokenData,
} from '../IEmailVerificationRepository';
import type { EmailVerificationToken } from '@prisma/client';

export class EmailVerificationRepository
  implements IEmailVerificationReader, IEmailVerificationWriter
{
  // READ OPERATIONS

  async findValidToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    return prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
  }

  async findActiveTokensForViewer(
    viewerId: string,
    streamId?: string
  ): Promise<EmailVerificationToken[]> {
    return prisma.emailVerificationToken.findMany({
      where: {
        viewerIdentityId: viewerId,
        ...(streamId ? { directStreamId: streamId } : {}),
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
  }

  // WRITE OPERATIONS

  async createToken(data: CreateTokenData): Promise<EmailVerificationToken> {
    return prisma.emailVerificationToken.create({
      data: {
        viewerIdentityId: data.viewerIdentityId,
        directStreamId: data.directStreamId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async markTokenUsed(id: string): Promise<EmailVerificationToken> {
    return prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateTokens(viewerId: string, streamId?: string): Promise<number> {
    const result = await prisma.emailVerificationToken.deleteMany({
      where: {
        viewerIdentityId: viewerId,
        ...(streamId ? { directStreamId: streamId } : {}),
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
    return result.count;
  }
}

