/**
 * Password Reset Token Repository Implementation (ISP)
 */
import { PrismaClient } from '@prisma/client';
import {
  IPasswordResetTokenRepository,
  PasswordResetTokenData,
  CreatePasswordResetTokenInput,
} from '../IPasswordResetTokenRepository';

export class PasswordResetTokenRepository
  implements IPasswordResetTokenRepository
{
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // READER METHODS
  // ============================================

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    return token as PasswordResetTokenData | null;
  }

  async findUnexpiredByEmail(
    email: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<PasswordResetTokenData[]> {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: {
        email,
        userType,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tokens as PasswordResetTokenData[];
  }

  async countRecentByEmail(
    email: string,
    userType: 'owner_user' | 'admin_account',
    sinceDate: Date
  ): Promise<number> {
    const count = await this.prisma.passwordResetToken.count({
      where: {
        email,
        userType,
        createdAt: {
          gte: sinceDate,
        },
      },
    });

    return count;
  }

  async findByUserId(
    userId: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<PasswordResetTokenData[]> {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: {
        userId,
        userType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tokens as PasswordResetTokenData[];
  }

  // ============================================
  // WRITER METHODS
  // ============================================

  async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenData> {
    const token = await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: input.tokenHash,
        userType: input.userType,
        userId: input.userId,
        email: input.email,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return token as PasswordResetTokenData;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async invalidateAllForUser(
    userId: string,
    userType: 'owner_user' | 'admin_account'
  ): Promise<number> {
    const result = await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        userType,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}

