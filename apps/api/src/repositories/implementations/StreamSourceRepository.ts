/**
 * Stream Source Repository Implementation
 * 
 * Prisma-based implementation of IStreamSourceReader and IStreamSourceWriter.
 */

import type { PrismaClient, StreamSource } from '@prisma/client';

import type {
  IStreamSourceReader,
  IStreamSourceWriter,
  CreateStreamSourceData,
  UpdateStreamSourceData,
} from '../IStreamSourceRepository';

export class StreamSourceRepository implements IStreamSourceReader, IStreamSourceWriter {
  constructor(private prisma: PrismaClient) {}

  async getByGameId(gameId: string): Promise<StreamSource | null> {
    return this.prisma.streamSource.findUnique({
      where: { gameId },
    });
  }

  async create(data: CreateStreamSourceData): Promise<StreamSource> {
    return this.prisma.streamSource.create({
      data: {
        gameId: data.gameId,
        type: data.type,
        protectionLevel: data.protectionLevel,
        muxAssetId: data.muxAssetId,
        muxPlaybackId: data.muxPlaybackId,
        hlsManifestUrl: data.hlsManifestUrl,
        rtmpPublishUrl: data.rtmpPublishUrl,
        rtmpStreamKey: data.rtmpStreamKey,
        externalEmbedUrl: data.externalEmbedUrl,
        externalProvider: data.externalProvider,
      },
    });
  }

  async update(id: string, data: UpdateStreamSourceData): Promise<StreamSource> {
    return this.prisma.streamSource.update({
      where: { id },
      data: {
        type: data.type,
        protectionLevel: data.protectionLevel,
        muxAssetId: data.muxAssetId,
        muxPlaybackId: data.muxPlaybackId,
        hlsManifestUrl: data.hlsManifestUrl,
        rtmpPublishUrl: data.rtmpPublishUrl,
        rtmpStreamKey: data.rtmpStreamKey,
        externalEmbedUrl: data.externalEmbedUrl,
        externalProvider: data.externalProvider,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.streamSource.delete({
      where: { id },
    });
  }
}
