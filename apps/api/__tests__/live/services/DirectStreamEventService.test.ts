/**
 * DirectStreamEvent Service Unit Tests (TDD)
 * 
 * Tests written BEFORE implementation to drive design
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DirectStreamEvent, DirectStream } from '@prisma/client';
import type { IDirectStreamEventReader, IDirectStreamEventWriter, ICreateDirectStreamEventInput, IUpdateDirectStreamEventInput } from '../repositories/IDirectStreamEventRepository';

// Shared data store for both reader and writer
class SharedEventStore {
  events: Map<string, DirectStreamEvent> = new Map();
  parentStreams: Map<string, DirectStream> = new Map();
}

// Mock implementations
class MockDirectStreamEventReader implements IDirectStreamEventReader {
  constructor(private store: SharedEventStore) {}
  
  async getById(id: string) {
    return this.store.events.get(id) || null;
  }
  
  async getByParentAndEventSlug(parentSlug: string, eventSlug: string) {
    for (const event of this.store.events.values()) {
      const parent = this.store.parentStreams.get(event.directStreamId);
      if (parent?.slug === parentSlug && event.eventSlug === eventSlug) {
        return event;
      }
    }
    return null;
  }
  
  async listByParent(filters: any) {
    const results = Array.from(this.store.events.values()).filter(
      e => e.directStreamId === filters.directStreamId
    );
    
    if (filters.status && filters.status !== 'all') {
      return results.filter(e => e.status === filters.status);
    }
    
    return results;
  }
  
  async getEffectiveConfig(parentSlug: string, eventSlug: string) {
    const event = await this.getByParentAndEventSlug(parentSlug, eventSlug);
    if (!event) return null;
    
    const parent = this.store.parentStreams.get(event.directStreamId);
    if (!parent) return null;
    
    // Merge parent + overrides
    return {
      id: event.id,
      directStreamId: event.directStreamId,
      parentSlug: parent.slug,
      eventSlug: event.eventSlug,
      title: event.title,
      streamUrl: event.streamUrl ?? parent.streamUrl,
      scheduledStartAt: event.scheduledStartAt,
      status: event.status as any,
      chatEnabled: event.chatEnabled ?? parent.chatEnabled,
      scoreboardEnabled: event.scoreboardEnabled ?? parent.scoreboardEnabled,
      paywallEnabled: event.paywallEnabled ?? parent.paywallEnabled,
      priceInCents: event.priceInCents ?? parent.priceInCents,
      paywallMessage: event.paywallMessage ?? parent.paywallMessage,
      allowAnonymousView: event.allowAnonymousView ?? parent.allowAnonymousView,
      requireEmailVerification: event.requireEmailVerification ?? parent.requireEmailVerification,
      listed: event.listed ?? parent.listed,
      scoreboardHomeTeam: event.scoreboardHomeTeam ?? parent.scoreboardHomeTeam,
      scoreboardAwayTeam: event.scoreboardAwayTeam ?? parent.scoreboardAwayTeam,
      scoreboardHomeColor: event.scoreboardHomeColor ?? parent.scoreboardHomeColor,
      scoreboardAwayColor: event.scoreboardAwayColor ?? parent.scoreboardAwayColor,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
  
  async countRegistrations(eventId: string) {
    return 0; // Mock
  }
  
  async getEventsNeedingReminders(minutesAhead: number) {
    return [];
  }
}

class MockDirectStreamEventWriter implements IDirectStreamEventWriter {
  constructor(private store: SharedEventStore) {}
  
  async create(input: ICreateDirectStreamEventInput) {
    const event: DirectStreamEvent = {
      id: `event-${Date.now()}-${Math.random()}`,
      directStreamId: input.directStreamId,
      eventSlug: input.eventSlug,
      title: input.title,
      streamUrl: input.streamUrl ?? null,
      scheduledStartAt: input.scheduledStartAt ?? null,
      reminderSentAt: null,
      status: 'active',
      chatEnabled: input.chatEnabled ?? null,
      scoreboardEnabled: input.scoreboardEnabled ?? null,
      paywallEnabled: input.paywallEnabled ?? null,
      priceInCents: input.priceInCents ?? null,
      paywallMessage: input.paywallMessage ?? null,
      allowAnonymousView: input.allowAnonymousView ?? null,
      requireEmailVerification: input.requireEmailVerification ?? null,
      listed: input.listed ?? null,
      scoreboardHomeTeam: input.scoreboardHomeTeam ?? null,
      scoreboardAwayTeam: input.scoreboardAwayTeam ?? null,
      scoreboardHomeColor: input.scoreboardHomeColor ?? null,
      scoreboardAwayColor: input.scoreboardAwayColor ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.store.events.set(event.id, event);
    return event;
  }
  
  async update(id: string, input: IUpdateDirectStreamEventInput) {
    const event = this.store.events.get(id);
    if (!event) throw new Error('Event not found');
    
    const updated = { ...event, ...input, updatedAt: new Date() };
    this.store.events.set(id, updated);
    return updated;
  }
  
  async archive(id: string) {
    return this.update(id, { status: 'archived' });
  }
  
  async softDelete(id: string) {
    return this.update(id, { status: 'deleted' });
  }
  
  async hardDelete(id: string) {
    this.store.events.delete(id);
  }
  
  async markReminderSent(id: string) {
    const event = this.store.events.get(id);
    if (!event) throw new Error('Event not found');
    
    event.reminderSentAt = new Date();
    return event;
  }
}

// Service to be implemented
interface IDirectStreamEventService {
  createEvent(input: ICreateDirectStreamEventInput): Promise<DirectStreamEvent>;
  updateEvent(id: string, input: IUpdateDirectStreamEventInput): Promise<DirectStreamEvent>;
  getEffectiveConfig(parentSlug: string, eventSlug: string): Promise<any>;
  listEvents(directStreamId: string, filters?: any): Promise<DirectStreamEvent[]>;
  archiveEvent(id: string): Promise<DirectStreamEvent>;
  deleteEvent(id: string, hard?: boolean): Promise<void>;
}

class DirectStreamEventService implements IDirectStreamEventService {
  constructor(
    private reader: IDirectStreamEventReader,
    private writer: IDirectStreamEventWriter
  ) {}
  
  async createEvent(input: ICreateDirectStreamEventInput) {
    // Validate eventSlug format
    if (!/^[a-z0-9-]+$/.test(input.eventSlug)) {
      throw new Error('Invalid eventSlug format');
    }
    
    // Check for duplicates
    const existing = await this.reader.getByParentAndEventSlug('', input.eventSlug);
    // Note: This is simplified, actual implementation will validate properly
    
    return this.writer.create(input);
  }
  
  async updateEvent(id: string, input: IUpdateDirectStreamEventInput) {
    const existing = await this.reader.getById(id);
    if (!existing) {
      throw new Error('Event not found');
    }
    
    return this.writer.update(id, input);
  }
  
  async getEffectiveConfig(parentSlug: string, eventSlug: string) {
    return this.reader.getEffectiveConfig(parentSlug, eventSlug);
  }
  
  async listEvents(directStreamId: string, filters: any = {}) {
    return this.reader.listByParent({ directStreamId, ...filters });
  }
  
  async archiveEvent(id: string) {
    return this.writer.archive(id);
  }
  
  async deleteEvent(id: string, hard = false) {
    if (hard) {
      await this.writer.hardDelete(id);
    } else {
      await this.writer.softDelete(id);
    }
  }
}

describe('DirectStreamEventService', () => {
  let store: SharedEventStore;
  let reader: MockDirectStreamEventReader;
  let writer: MockDirectStreamEventWriter;
  let service: IDirectStreamEventService;
  
  beforeEach(() => {
    store = new SharedEventStore();
    reader = new MockDirectStreamEventReader(store);
    writer = new MockDirectStreamEventWriter(store);
    service = new DirectStreamEventService(reader, writer);
  });
  
  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const input: ICreateDirectStreamEventInput = {
        directStreamId: 'parent-123',
        eventSlug: 'soccer-varsity-2026-01-10',
        title: 'Varsity Soccer vs Rival HS',
      };
      
      const event = await service.createEvent(input);
      
      expect(event).toBeDefined();
      expect(event.eventSlug).toBe('soccer-varsity-2026-01-10');
      expect(event.title).toBe('Varsity Soccer vs Rival HS');
      expect(event.status).toBe('active');
    });
    
    it('should reject invalid eventSlug', async () => {
      const input: ICreateDirectStreamEventInput = {
        directStreamId: 'parent-123',
        eventSlug: 'Invalid Slug!',
        title: 'Test',
      };
      
      await expect(service.createEvent(input)).rejects.toThrow('Invalid eventSlug format');
    });
    
    it('should accept null overrides (inherit from parent)', async () => {
      const input: ICreateDirectStreamEventInput = {
        directStreamId: 'parent-123',
        eventSlug: 'test-event',
        title: 'Test Event',
        chatEnabled: null,
        paywallEnabled: null,
      };
      
      const event = await service.createEvent(input);
      
      expect(event.chatEnabled).toBeNull();
      expect(event.paywallEnabled).toBeNull();
    });
  });
  
  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const created = await writer.create({
        directStreamId: 'parent-123',
        eventSlug: 'test',
        title: 'Original Title',
      });
      
      const updated = await service.updateEvent(created.id, {
        title: 'Updated Title',
      });
      
      expect(updated.title).toBe('Updated Title');
    });
    
    it('should throw error when event not found', async () => {
      await expect(service.updateEvent('nonexistent', { title: 'Test' }))
        .rejects.toThrow('Event not found');
    });
  });
  
  describe('getEffectiveConfig', () => {
    it('should merge parent defaults with event overrides', async () => {
      // Setup parent stream
      const parent: DirectStream = {
        id: 'parent-123',
        slug: 'tchs',
        title: 'TCHS Live Stream',
        ownerAccountId: 'owner-123',
        streamUrl: 'https://parent-stream.com/hls',
        scheduledStartAt: null,
        reminderSentAt: null,
        sendReminders: true,
        reminderMinutes: 5,
        paywallEnabled: true,
        priceInCents: 500,
        paywallMessage: 'Parent paywall message',
        allowSavePayment: false,
        adminPassword: 'hashed',
        chatEnabled: true,
        scoreboardEnabled: true,
        allowAnonymousView: false,
        requireEmailVerification: true,
        listed: true,
        status: 'active',
        scoreboardHomeTeam: 'TCHS',
        scoreboardAwayTeam: 'Opponent',
        scoreboardHomeColor: '#0000FF',
        scoreboardAwayColor: '#FF0000',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.parentStreams.set(parent.id, parent);
      
      // Setup event with overrides
      const event: DirectStreamEvent = {
        id: 'event-123',
        directStreamId: 'parent-123',
        eventSlug: 'soccer-varsity',
        title: 'Varsity Soccer',
        streamUrl: 'https://event-stream.com/hls', // Override
        scheduledStartAt: new Date('2026-01-10T18:00:00Z'),
        reminderSentAt: null,
        status: 'active',
        chatEnabled: null, // Inherit
        scoreboardEnabled: null, // Inherit
        paywallEnabled: false, // Override to disable
        priceInCents: null, // Inherit
        paywallMessage: null,
        allowAnonymousView: null,
        requireEmailVerification: null,
        listed: null,
        scoreboardHomeTeam: 'TCHS Varsity', // Override
        scoreboardAwayTeam: null, // Inherit
        scoreboardHomeColor: null,
        scoreboardAwayColor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.events.set(event.id, event);
      
      const config = await service.getEffectiveConfig('tchs', 'soccer-varsity');
      
      expect(config).toBeDefined();
      expect(config!.streamUrl).toBe('https://event-stream.com/hls'); // Overridden
      expect(config!.chatEnabled).toBe(true); // Inherited
      expect(config!.paywallEnabled).toBe(false); // Overridden
      expect(config!.scoreboardHomeTeam).toBe('TCHS Varsity'); // Overridden
      expect(config!.scoreboardAwayTeam).toBe('Opponent'); // Inherited
    });
    
    it('should return null for nonexistent event', async () => {
      const config = await service.getEffectiveConfig('tchs', 'nonexistent');
      expect(config).toBeNull();
    });
  });
  
  describe('listEvents', () => {
    it('should list events by parent', async () => {
      await writer.create({ directStreamId: 'parent-123', eventSlug: 'event-1', title: 'Event 1' });
      await writer.create({ directStreamId: 'parent-123', eventSlug: 'event-2', title: 'Event 2' });
      await writer.create({ directStreamId: 'parent-456', eventSlug: 'event-3', title: 'Event 3' });
      
      const events = await service.listEvents('parent-123');
      
      expect(events).toHaveLength(2);
      expect(events[0].eventSlug).toBe('event-1');
      expect(events[1].eventSlug).toBe('event-2');
    });
    
    it('should filter by status', async () => {
      const e1 = await writer.create({ directStreamId: 'parent-123', eventSlug: 'active-event', title: 'Active' });
      const e2 = await writer.create({ directStreamId: 'parent-123', eventSlug: 'archived-event', title: 'Archived' });
      await writer.archive(e2.id);
      
      const activeEvents = await service.listEvents('parent-123', { status: 'active' });
      expect(activeEvents).toHaveLength(1);
      expect(activeEvents[0].eventSlug).toBe('active-event');
    });
  });
  
  describe('archiveEvent', () => {
    it('should archive event', async () => {
      const created = await writer.create({
        directStreamId: 'parent-123',
        eventSlug: 'test',
        title: 'Test',
      });
      
      const archived = await service.archiveEvent(created.id);
      
      expect(archived.status).toBe('archived');
    });
  });
  
  describe('deleteEvent', () => {
    it('should soft delete by default', async () => {
      const created = await writer.create({
        directStreamId: 'parent-123',
        eventSlug: 'test',
        title: 'Test',
      });
      
      await service.deleteEvent(created.id);
      
      const event = store.events.get(created.id);
      expect(event?.status).toBe('deleted');
    });
    
    it('should hard delete when specified', async () => {
      const created = await writer.create({
        directStreamId: 'parent-123',
        eventSlug: 'test',
        title: 'Test',
      });
      
      await service.deleteEvent(created.id, true);
      
      const event = store.events.get(created.id);
      expect(event).toBeUndefined();
    });
  });
});

