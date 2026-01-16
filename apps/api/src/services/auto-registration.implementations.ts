/**
 * Concrete Implementations of Auto-Registration Interfaces
 * 
 * Adapts existing repositories to ISP interfaces
 */

import type {
  IRegistrationChecker,
  IRegistrationCreator,
  IViewerIdentityReader,
  IDirectStreamReader,
} from './auto-registration.interfaces';
import type { PrismaClient, DirectStreamRegistration, ViewerIdentity, DirectStream } from '@prisma/client';

/**
 * Prisma-based Registration Checker
 */
export class PrismaRegistrationChecker implements IRegistrationChecker {
  constructor(private prisma: PrismaClient) {}

  async isViewerRegistered(streamId: string, viewerIdentityId: string): Promise<boolean> {
    const registration = await this.prisma.directStreamRegistration.findUnique({
      where: {
        directStreamId_viewerIdentityId: {
          directStreamId: streamId,
          viewerIdentityId,
        },
      },
    });

    return registration !== null;
  }

  async getExistingRegistration(
    streamId: string,
    viewerIdentityId: string
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

/**
 * Prisma-based Registration Creator
 */
export class PrismaRegistrationCreator implements IRegistrationCreator {
  constructor(private prisma: PrismaClient) {}

  async createRegistration(
    streamId: string,
    viewerIdentityId: string
  ): Promise<DirectStreamRegistration> {
    // Create registration without access token (will be generated on-demand)
    return this.prisma.directStreamRegistration.create({
      data: {
        directStreamId: streamId,
        viewerIdentityId,
        registeredAt: new Date(),
        wantsReminders: false,
      },
    });
  }
}

/**
 * Prisma-based Viewer Identity Reader
 */
export class PrismaViewerIdentityReader implements IViewerIdentityReader {
  constructor(private prisma: PrismaClient) {}

  async getById(id: string): Promise<ViewerIdentity | null> {
    return this.prisma.viewerIdentity.findUnique({
      where: { id },
    });
  }
}

/**
 * Prisma-based Direct Stream Reader
 */
export class PrismaDirectStreamReader implements IDirectStreamReader {
  constructor(private prisma: PrismaClient) {}

  async getBySlug(slug: string): Promise<DirectStream | null> {
    // Try parent stream first
    const parentStream = await this.prisma.directStream.findUnique({
      where: { slug },
    });

    if (parentStream) {
      return parentStream;
    }

    // Try to parse as event slug (e.g., "tchs/soccer-20260113-varsity")
    const parts = slug.split('/');
    if (parts.length === 2) {
      const [parentSlug, eventSlug] = parts;
      
      const eventStream = await this.prisma.directStreamEvent.findFirst({
        where: {
          eventSlug,
          directStream: {
            slug: parentSlug,
          },
        },
        include: {
          directStream: true,
        },
      });

      if (eventStream) {
        // Return parent stream for registration
        return eventStream.directStream;
      }
    }

    return null;
  }
}

/**
 * Factory function to create AutoRegistrationService with Prisma implementations
 */
import { AutoRegistrationService } from './auto-registration.service';

export function createAutoRegistrationService(prisma: PrismaClient): AutoRegistrationService {
  return new AutoRegistrationService(
    new PrismaRegistrationChecker(prisma),
    new PrismaRegistrationCreator(prisma),
    new PrismaViewerIdentityReader(prisma),
    new PrismaDirectStreamReader(prisma)
  );
}

