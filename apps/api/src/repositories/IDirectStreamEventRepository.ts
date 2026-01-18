/**
 * DirectStreamEvent Repository Interfaces
 * 
 * Following ISP (Interface Segregation Principle):
 * - IDirectStreamEventReader: Read operations
 * - IDirectStreamEventWriter: Write operations
 */

import type { DirectStreamEvent } from '@prisma/client';

/**
 * Create DirectStreamEvent Input
 */
export interface ICreateDirectStreamEventInput {
  directStreamId: string;
  eventSlug: string;
  title: string;
  streamUrl?: string | null;
  scheduledStartAt?: Date | null;
  
  // Feature flag overrides (null = inherit from parent)
  chatEnabled?: boolean | null;
  scoreboardEnabled?: boolean | null;
  paywallEnabled?: boolean | null;
  priceInCents?: number | null;
  paywallMessage?: string | null;
  allowAnonymousView?: boolean | null;
  requireEmailVerification?: boolean | null;
  listed?: boolean | null;
  
  // Scoreboard overrides (null = inherit from parent)
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

/**
 * Update DirectStreamEvent Input
 */
export interface IUpdateDirectStreamEventInput {
  eventSlug?: string;
  title?: string;
  streamUrl?: string | null;
  scheduledStartAt?: Date | null;
  status?: 'active' | 'archived' | 'deleted';
  
  // Feature flag overrides
  chatEnabled?: boolean | null;
  scoreboardEnabled?: boolean | null;
  paywallEnabled?: boolean | null;
  priceInCents?: number | null;
  paywallMessage?: string | null;
  allowAnonymousView?: boolean | null;
  requireEmailVerification?: boolean | null;
  listed?: boolean | null;
  
  // Scoreboard overrides
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

/**
 * List DirectStreamEvents Filters
 */
export interface IListDirectStreamEventsFilters {
  directStreamId: string;
  status?: 'active' | 'archived' | 'deleted' | 'all';
  upcoming?: boolean; // Only show future events
  sortBy?: 'scheduledStartAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Effective Configuration (parent + event overrides merged)
 */
export interface IEffectiveEventConfig {
  // Identity
  id: string;
  directStreamId: string;
  parentSlug: string;
  eventSlug: string;
  title: string;
  streamUrl: string | null;
  scheduledStartAt: Date | null;
  
  // Lifecycle
  status: 'active' | 'archived' | 'deleted';
  
  // Feature flags (resolved from parent + overrides)
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage: string | null;
  allowAnonymousView: boolean;
  requireEmailVerification: boolean;
  listed: boolean;
  
  // Scoreboard config (resolved from parent + overrides)
  scoreboardHomeTeam: string | null;
  scoreboardAwayTeam: string | null;
  scoreboardHomeColor: string | null;
  scoreboardAwayColor: string | null;
  
  // 🆕 Viewer editing permissions (resolved from parent + overrides)
  allowViewerScoreEdit: boolean;
  allowViewerNameEdit: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DirectStreamEvent Reader Interface (ISP)
 * 
 * Segregated read-only operations
 */
export interface IDirectStreamEventReader {
  /**
   * Get event by ID
   */
  getById(id: string): Promise<DirectStreamEvent | null>;
  
  /**
   * Get event by parent slug + event slug
   */
  getByParentAndEventSlug(parentSlug: string, eventSlug: string): Promise<DirectStreamEvent | null>;
  
  /**
   * List events by parent stream ID with filters
   */
  listByParent(filters: IListDirectStreamEventsFilters): Promise<DirectStreamEvent[]>;
  
  /**
   * Get effective configuration (parent defaults + event overrides merged)
   */
  getEffectiveConfig(parentSlug: string, eventSlug: string): Promise<IEffectiveEventConfig | null>;
  
  /**
   * Count registrations for an event
   */
  countRegistrations(eventId: string): Promise<number>;
  
  /**
   * Get events needing reminders (scheduledStartAt within X minutes, not yet sent)
   */
  getEventsNeedingReminders(minutesAhead: number): Promise<DirectStreamEvent[]>;
}

/**
 * DirectStreamEvent Writer Interface (ISP)
 * 
 * Segregated write operations
 */
export interface IDirectStreamEventWriter {
  /**
   * Create a new event
   */
  create(input: ICreateDirectStreamEventInput): Promise<DirectStreamEvent>;
  
  /**
   * Update an event
   */
  update(id: string, input: IUpdateDirectStreamEventInput): Promise<DirectStreamEvent>;
  
  /**
   * Archive an event (soft delete to archived status)
   */
  archive(id: string): Promise<DirectStreamEvent>;
  
  /**
   * Soft delete (mark as deleted)
   */
  softDelete(id: string): Promise<DirectStreamEvent>;
  
  /**
   * Hard delete (permanently remove)
   */
  hardDelete(id: string): Promise<void>;
  
  /**
   * Mark reminder as sent
   */
  markReminderSent(id: string): Promise<DirectStreamEvent>;
}

