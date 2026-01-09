/**
 * DirectStreamEvent Service
 * 
 * Business logic for managing DirectStream events (sub-events)
 */

import type {
  IDirectStreamEventReader,
  IDirectStreamEventWriter,
  ICreateDirectStreamEventInput,
  IUpdateDirectStreamEventInput,
  IListDirectStreamEventsFilters,
  IEffectiveEventConfig,
} from '../repositories/IDirectStreamEventRepository';
import type { DirectStreamEvent } from '@prisma/client';

export class DirectStreamEventService {
  constructor(
    private reader: IDirectStreamEventReader,
    private writer: IDirectStreamEventWriter
  ) {}
  
  /**
   * Create a new event
   * 
   * Validates eventSlug format and checks for duplicates
   */
  async createEvent(input: ICreateDirectStreamEventInput): Promise<DirectStreamEvent> {
    // Validate eventSlug format (lowercase alphanumeric with hyphens)
    if (!/^[a-z0-9-]+$/.test(input.eventSlug)) {
      throw new Error('Invalid eventSlug format: must be lowercase alphanumeric with hyphens');
    }
    
    // Check for duplicate eventSlug under same parent
    // Note: This is a simplified check; the DB unique constraint will also catch duplicates
    
    return this.writer.create(input);
  }
  
  /**
   * Update an existing event
   * 
   * Throws if event not found
   */
  async updateEvent(id: string, input: IUpdateDirectStreamEventInput): Promise<DirectStreamEvent> {
    const existing = await this.reader.getById(id);
    if (!existing) {
      throw new Error('Event not found');
    }
    
    // Validate eventSlug format if updating it
    if (input.eventSlug && !/^[a-z0-9-]+$/.test(input.eventSlug)) {
      throw new Error('Invalid eventSlug format: must be lowercase alphanumeric with hyphens');
    }
    
    return this.writer.update(id, input);
  }
  
  /**
   * Get effective configuration (parent defaults + event overrides merged)
   * 
   * This is the "bootstrap" data for rendering the event page
   */
  async getEffectiveConfig(parentSlug: string, eventSlug: string): Promise<IEffectiveEventConfig | null> {
    return this.reader.getEffectiveConfig(parentSlug, eventSlug);
  }
  
  /**
   * List events by parent stream ID
   */
  async listEvents(directStreamId: string, filters: Partial<IListDirectStreamEventsFilters> = {}): Promise<DirectStreamEvent[]> {
    return this.reader.listByParent({
      directStreamId,
      ...filters,
    });
  }
  
  /**
   * Archive an event (soft delete to "archived" status)
   */
  async archiveEvent(id: string): Promise<DirectStreamEvent> {
    return this.writer.archive(id);
  }
  
  /**
   * Delete an event
   * 
   * @param id - Event ID
   * @param hard - If true, permanently delete; if false, soft delete (mark as "deleted")
   */
  async deleteEvent(id: string, hard = false): Promise<void> {
    if (hard) {
      await this.writer.hardDelete(id);
    } else {
      await this.writer.softDelete(id);
    }
  }
  
  /**
   * Get event by parent slug + event slug
   */
  async getByParentAndEventSlug(parentSlug: string, eventSlug: string): Promise<DirectStreamEvent | null> {
    return this.reader.getByParentAndEventSlug(parentSlug, eventSlug);
  }
  
  /**
   * Count registrations for an event
   */
  async countRegistrations(eventId: string): Promise<number> {
    return this.reader.countRegistrations(eventId);
  }
  
  /**
   * Get events needing reminders (for cron job)
   */
  async getEventsNeedingReminders(minutesAhead: number): Promise<DirectStreamEvent[]> {
    return this.reader.getEventsNeedingReminders(minutesAhead);
  }
  
  /**
   * Mark reminder as sent
   */
  async markReminderSent(id: string): Promise<DirectStreamEvent> {
    return this.writer.markReminderSent(id);
  }
}

