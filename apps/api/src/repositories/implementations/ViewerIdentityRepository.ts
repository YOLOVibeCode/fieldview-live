/**
 * Viewer Identity Repository Implementation
 * 
 * Prisma-based implementation of IViewerIdentityReader and IViewerIdentityWriter.
 */

import type { PrismaClient, ViewerIdentity } from '@prisma/client';

import type {
  IViewerIdentityReader,
  IViewerIdentityWriter,
  CreateViewerIdentityData,
  UpdateViewerIdentityData,
} from '../IViewerIdentityRepository';

export class ViewerIdentityRepository implements IViewerIdentityReader, IViewerIdentityWriter {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findUnique({
      where: { id },
    });
  }

  async getByEmail(email: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findUnique({
      where: { email },
    });
  }

  async getByPhone(phoneE164: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findFirst({
      where: { phoneE164 },
    });
  }

  async create(data: CreateViewerIdentityData): Promise<ViewerIdentity> {
    return this.prisma.viewerIdentity.create({
      data,
    });
  }

  async update(id: string, data: UpdateViewerIdentityData): Promise<ViewerIdentity> {
    return this.prisma.viewerIdentity.update({
      where: { id },
      data,
    });
  }
}
