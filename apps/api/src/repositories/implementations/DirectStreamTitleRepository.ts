/**
 * DirectStream Title Repository Implementation
 *
 * Minimal Prisma implementation for fetching stream titles.
 */

import type { PrismaClient } from '@prisma/client';
import type { IDirectStreamTitleReader } from '../IDirectStreamRepository';

export class DirectStreamTitleRepository implements IDirectStreamTitleReader {
  constructor(private prisma: PrismaClient) {}

  async getTitleById(id: string): Promise<{ title: string } | null> {
    return this.prisma.directStream.findUnique({
      where: { id },
      select: { title: true },
    });
  }
}
