/**
 * DirectStreamEvent Prisma Repository Implementation
 * 
 * Implements IDirectStreamEventReader and IDirectStreamEventWriter using Prisma ORM
 */

import { PrismaClient, DirectStreamEvent } from '@prisma/client';
import type {
  IDirectStreamEventReader,
  IDirectStreamEventWriter,
  ICreateDirectStreamEventInput,
  IUpdateDirectStreamEventInput,
  IListDirectStreamEventsFilters,
  IEffectiveEventConfig,
} from './IDirectStreamEventRepository';

export class DirectStreamEventRepository implements IDirectStreamEventReader, IDirectStreamEventWriter {
  constructor(private prisma: PrismaClient) {}
  
  // ==================== READER METHODS ====================
  
  async getById(id: string): Promise<DirectStreamEvent | null> {
    return this.prisma.directStreamEvent.findUnique({
      where: { id },
    });
  }
  
  async getByParentAndEventSlug(parentSlug: string, eventSlug: string): Promise<DirectStreamEvent | null> {
    return this.prisma.directStreamEvent.findFirst({
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
  }
  
  async listByParent(filters: IListDirectStreamEventsFilters): Promise<DirectStreamEvent[]> {
    const { directStreamId, status = 'active', upcoming, sortBy = 'scheduledStartAt', sortOrder = 'asc' } = filters;
    
    const where: any = {
      directStreamId,
    };
    
    // Status filter
    if (status !== 'all') {
      where.status = status;
    }
    
    // Upcoming filter
    if (upcoming) {
      where.scheduledStartAt = {
        gte: new Date(),
      };
    }
    
    // Sort order
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;
    
    return this.prisma.directStreamEvent.findMany({
      where,
      orderBy,
    });
  }
  
  async getEffectiveConfig(parentSlug: string, eventSlug: string): Promise<IEffectiveEventConfig | null> {
    const event = await this.prisma.directStreamEvent.findFirst({
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
    
    if (!event) return null;
    
    const parent = event.directStream;
    
    // Merge parent defaults with event overrides
    return {
      id: event.id,
      directStreamId: event.directStreamId,
      parentSlug: parent.slug,
      eventSlug: event.eventSlug,
      title: event.title,
      streamUrl: event.streamUrl ?? parent.streamUrl,
      scheduledStartAt: event.scheduledStartAt,
      status: event.status as 'active' | 'archived' | 'deleted',
      
      // Feature flags (event override ?? parent default)
      chatEnabled: event.chatEnabled ?? parent.chatEnabled,
      scoreboardEnabled: event.scoreboardEnabled ?? parent.scoreboardEnabled,
      paywallEnabled: event.paywallEnabled ?? parent.paywallEnabled,
      priceInCents: event.priceInCents ?? parent.priceInCents,
      paywallMessage: event.paywallMessage ?? parent.paywallMessage,
      allowAnonymousView: event.allowAnonymousView ?? parent.allowAnonymousView,
      requireEmailVerification: event.requireEmailVerification ?? parent.requireEmailVerification,
      listed: event.listed ?? parent.listed,
      
      // Scoreboard config
      scoreboardHomeTeam: event.scoreboardHomeTeam ?? parent.scoreboardHomeTeam,
      scoreboardAwayTeam: event.scoreboardAwayTeam ?? parent.scoreboardAwayTeam,
      scoreboardHomeColor: event.scoreboardHomeColor ?? parent.scoreboardHomeColor,
      scoreboardAwayColor: event.scoreboardAwayColor ?? parent.scoreboardAwayColor,
      
      // 🆕 Viewer editing permissions
      allowViewerScoreEdit: event.allowViewerScoreEdit ?? parent.allowViewerScoreEdit,
      allowViewerNameEdit: event.allowViewerNameEdit ?? parent.allowViewerNameEdit,
      
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
  
  async countRegistrations(eventId: string): Promise<number> {
    return this.prisma.directStreamRegistration.count({
      where: {
        directStreamEventId: eventId,
      },
    });
  }
  
  async getEventsNeedingReminders(minutesAhead: number): Promise<DirectStreamEvent[]> {
    const now = new Date();
    const targetTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
    
    return this.prisma.directStreamEvent.findMany({
      where: {
        status: 'active',
        scheduledStartAt: {
          gte: now,
          lte: targetTime,
        },
        reminderSentAt: null,
        directStream: {
          sendReminders: true,
        },
      },
      include: {
        directStream: true,
      },
    });
  }
  
  // ==================== WRITER METHODS ====================
  
  async create(input: ICreateDirectStreamEventInput): Promise<DirectStreamEvent> {
    return this.prisma.directStreamEvent.create({
      data: {
        directStreamId: input.directStreamId,
        eventSlug: input.eventSlug,
        title: input.title,
        streamUrl: input.streamUrl,
        scheduledStartAt: input.scheduledStartAt,
        chatEnabled: input.chatEnabled,
        scoreboardEnabled: input.scoreboardEnabled,
        paywallEnabled: input.paywallEnabled,
        priceInCents: input.priceInCents,
        paywallMessage: input.paywallMessage,
        allowAnonymousView: input.allowAnonymousView,
        requireEmailVerification: input.requireEmailVerification,
        listed: input.listed,
        scoreboardHomeTeam: input.scoreboardHomeTeam,
        scoreboardAwayTeam: input.scoreboardAwayTeam,
        scoreboardHomeColor: input.scoreboardHomeColor,
        scoreboardAwayColor: input.scoreboardAwayColor,
      },
    });
  }
  
  async update(id: string, input: IUpdateDirectStreamEventInput): Promise<DirectStreamEvent> {
    return this.prisma.directStreamEvent.update({
      where: { id },
      data: input,
    });
  }
  
  async archive(id: string): Promise<DirectStreamEvent> {
    return this.prisma.directStreamEvent.update({
      where: { id },
      data: { status: 'archived' },
    });
  }
  
  async softDelete(id: string): Promise<DirectStreamEvent> {
    return this.prisma.directStreamEvent.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }
  
  async hardDelete(id: string): Promise<void> {
    await this.prisma.directStreamEvent.delete({
      where: { id },
    });
  }
  
  async markReminderSent(id: string): Promise<DirectStreamEvent> {
    return this.prisma.directStreamEvent.update({
      where: { id },
      data: { reminderSentAt: new Date() },
    });
  }
}

