/**
 * Concrete Prisma Implementations of Notify-Me Interfaces
 *
 * Adapts Prisma to the ISP interfaces for the "notify me" signup flow.
 */

import type { PrismaClient, ViewerIdentity, DirectStream, DirectStreamRegistration } from '@prisma/client';
import type {
  INotifyMeViewerReader,
  INotifyMeStreamReader,
  INotifyMeRegistrationChecker,
  INotifyMeViewerWriter,
  INotifyMeRegistrationWriter,
  INotifyMeRegistrationUpdater,
} from './notify-me.interfaces';
import { NotifyMeService } from './notify-me.service';

export class PrismaNotifyMeViewerReader implements INotifyMeViewerReader {
  constructor(private prisma: PrismaClient) {}

  async getByEmail(email: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findUnique({
      where: { email },
    });
  }

  async getById(id: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findUnique({
      where: { id },
    });
  }
}

export class PrismaNotifyMeStreamReader implements INotifyMeStreamReader {
  constructor(private prisma: PrismaClient) {}

  async getBySlug(slug: string): Promise<DirectStream | null> {
    return this.prisma.directStream.findUnique({
      where: { slug, status: 'active' },
    });
  }
}

export class PrismaNotifyMeRegistrationChecker implements INotifyMeRegistrationChecker {
  constructor(private prisma: PrismaClient) {}

  async getExistingRegistration(
    streamId: string,
    viewerIdentityId: string,
  ): Promise<DirectStreamRegistration | null> {
    return this.prisma.directStreamRegistration.findUnique({
      where: {
        directStreamId_viewerIdentityId: {
          directStreamId: streamId,
          viewerIdentityId,
        },
      },
    });
  }
}

export class PrismaNotifyMeViewerWriter implements INotifyMeViewerWriter {
  constructor(private prisma: PrismaClient) {}

  async createViewer(email: string): Promise<ViewerIdentity> {
    return this.prisma.viewerIdentity.create({
      data: {
        email,
        wantsReminders: true,
      },
    });
  }
}

export class PrismaNotifyMeRegistrationWriter implements INotifyMeRegistrationWriter {
  constructor(private prisma: PrismaClient) {}

  async createRegistration(
    streamId: string,
    viewerIdentityId: string,
  ): Promise<DirectStreamRegistration> {
    return this.prisma.directStreamRegistration.create({
      data: {
        directStreamId: streamId,
        viewerIdentityId,
        registeredAt: new Date(),
        wantsReminders: true,
      },
    });
  }
}

export class PrismaNotifyMeRegistrationUpdater implements INotifyMeRegistrationUpdater {
  constructor(private prisma: PrismaClient) {}

  async setWantsReminders(
    streamId: string,
    viewerIdentityId: string,
    value: boolean,
  ): Promise<DirectStreamRegistration | null> {
    try {
      return await this.prisma.directStreamRegistration.update({
        where: {
          directStreamId_viewerIdentityId: {
            directStreamId: streamId,
            viewerIdentityId,
          },
        },
        data: { wantsReminders: value },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
        return null;
      }
      throw e;
    }
  }
}

/**
 * Factory: create a fully-wired NotifyMeService
 */
export function createNotifyMeService(prisma: PrismaClient): NotifyMeService {
  return new NotifyMeService(
    new PrismaNotifyMeViewerReader(prisma),
    new PrismaNotifyMeStreamReader(prisma),
    new PrismaNotifyMeRegistrationChecker(prisma),
    new PrismaNotifyMeViewerWriter(prisma),
    new PrismaNotifyMeRegistrationWriter(prisma),
    new PrismaNotifyMeRegistrationUpdater(prisma),
  );
}
