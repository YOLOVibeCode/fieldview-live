/**
 * Viewer Refresh Token Repository Implementation (ISP)
 */
import { PrismaClient } from '@prisma/client';
import {
  IViewerRefreshTokenRepository,
  ViewerRefreshTokenData,
  CreateViewerRefreshTokenInput,
} from '../IViewerRefreshTokenRepository';

export class ViewerRefreshTokenRepository implements IViewerRefreshTokenRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // READER METHODS
  // ============================================

  async findByTokenHash(tokenHash: string): Promise<ViewerRefreshTokenData | null> {
    const token = await this.prisma.viewerRefreshToken.findUnique({
      where: { tokenHash },
    });

    return token;
  }

  async findUnexpiredByViewerId(viewerIdentityId: string): Promise<ViewerRefreshTokenData[]> {
    const tokens = await this.prisma.viewerRefreshToken.findMany({
      where: {
        viewerIdentityId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tokens;
  }

  async countRecentByEmail(email: string, sinceDate: Date): Promise<number> {
    // Find viewer identity by email
    const viewer = await this.prisma.viewerIdentity.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!viewer) {
      return 0;
    }

    const count = await this.prisma.viewerRefreshToken.count({
      where: {
        viewerIdentityId: viewer.id,
        createdAt: {
          gte: sinceDate,
        },
      },
    });

    return count;
  }

  // ============================================
  // WRITER METHODS
  // ============================================

  async create(input: CreateViewerRefreshTokenInput): Promise<ViewerRefreshTokenData> {
    const token = await this.prisma.viewerRefreshToken.create({
      data: {
        tokenHash: input.tokenHash,
        viewerIdentityId: input.viewerIdentityId,
        directStreamId: input.directStreamId,
        gameId: input.gameId,
        redirectUrl: input.redirectUrl,
        expiresAt: input.expiresAt,
      },
    });

    return token;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.viewerRefreshToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async invalidateAllForViewer(viewerIdentityId: string): Promise<number> {
    const result = await this.prisma.viewerRefreshToken.updateMany({
      where: {
        viewerIdentityId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.viewerRefreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}

