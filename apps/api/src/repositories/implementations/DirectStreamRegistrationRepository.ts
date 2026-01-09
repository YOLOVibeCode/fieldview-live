/**
 * DirectStreamRegistration Repository Implementation
 */

import { prisma } from '../../lib/prisma';
import type {
  IDirectStreamRegistrationReader,
  IDirectStreamRegistrationWriter,
  CreateRegistrationData,
  RegistrationWithViewer,
} from '../IDirectStreamRegistrationRepository';
import type { DirectStreamRegistration } from '@prisma/client';

export class DirectStreamRegistrationRepository
  implements IDirectStreamRegistrationReader, IDirectStreamRegistrationWriter
{
  // READ OPERATIONS

  async findByStreamAndViewer(
    streamId: string,
    viewerId: string
  ): Promise<DirectStreamRegistration | null> {
    return prisma.directStreamRegistration.findUnique({
      where: {
        directStreamId_viewerIdentityId: {
          directStreamId: streamId,
          viewerIdentityId: viewerId,
        },
      },
    });
  }

  async findByStream(streamId: string): Promise<RegistrationWithViewer[]> {
    return prisma.directStreamRegistration.findMany({
      where: { directStreamId: streamId },
      include: {
        viewerIdentity: true,
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async countByStream(streamId: string): Promise<number> {
    return prisma.directStreamRegistration.count({
      where: { directStreamId: streamId },
    });
  }

  async findVerifiedByStream(streamId: string): Promise<RegistrationWithViewer[]> {
    return prisma.directStreamRegistration.findMany({
      where: {
        directStreamId: streamId,
        verifiedAt: { not: null },
      },
      include: {
        viewerIdentity: true,
      },
      orderBy: { verifiedAt: 'desc' },
    });
  }

  // WRITE OPERATIONS

  async create(data: CreateRegistrationData): Promise<DirectStreamRegistration> {
    return prisma.directStreamRegistration.create({
      data: {
        directStreamId: data.directStreamId,
        viewerIdentityId: data.viewerIdentityId,
        wantsReminders: data.wantsReminders,
      },
    });
  }

  async updateVerifiedAt(id: string, verifiedAt: Date): Promise<DirectStreamRegistration> {
    return prisma.directStreamRegistration.update({
      where: { id },
      data: { verifiedAt },
    });
  }

  async updateLastSeenAt(id: string): Promise<DirectStreamRegistration> {
    return prisma.directStreamRegistration.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }
}

