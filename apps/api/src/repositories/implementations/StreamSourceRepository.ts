/**
 * Stream Source Repository Implementation
 * 
 * Prisma-based implementation of IStreamSourceReader.
 */

import type { PrismaClient, StreamSource } from '@prisma/client';

import type { IStreamSourceReader } from '../IStreamSourceRepository';

export class StreamSourceRepository implements IStreamSourceReader {
  constructor(private prisma: PrismaClient) {}

  async getByGameId(gameId: string): Promise<StreamSource | null> {
    return this.prisma.streamSource.findUnique({
      where: { gameId },
    });
  }
}
