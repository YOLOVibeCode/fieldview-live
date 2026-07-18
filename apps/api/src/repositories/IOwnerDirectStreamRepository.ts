/**
 * Owner DirectStream Repository Interfaces
 *
 * Following ISP (Interface Segregation Principle):
 * - IOwnerDirectStreamReader: Read operations scoped to an owner
 * - IOwnerDirectStreamWriter: Write operations scoped to an owner
 */

import type { DirectStream } from '@prisma/client';

/**
 * Create DirectStream Input (owner-facing)
 */
export interface ICreateOwnerDirectStreamInput {
  ownerAccountId: string;
  slug: string;
  title: string;
  streamUrl?: string | null;
  scheduledStartAt?: Date | null;
  adminPassword: string; // Already hashed by service layer

  // Feature flags
  chatEnabled?: boolean;
  scoreboardEnabled?: boolean;

  // Paywall settings
  paywallEnabled?: boolean;
  priceInCents?: number;
  paywallMessage?: string | null;

  // Access control
  allowAnonymousView?: boolean;
  requireEmailVerification?: boolean;
  listed?: boolean;

  // Scoreboard defaults
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

/**
 * Update DirectStream Input (owner-facing, all optional for partial updates)
 */
export interface IUpdateOwnerDirectStreamInput {
  title?: string;
  streamUrl?: string | null;
  scheduledStartAt?: Date | null;

  // Feature flags
  chatEnabled?: boolean;
  scoreboardEnabled?: boolean;

  // Paywall settings
  paywallEnabled?: boolean;
  priceInCents?: number;
  paywallMessage?: string | null;

  // Access control
  allowAnonymousView?: boolean;
  requireEmailVerification?: boolean;
  listed?: boolean;

  // Scoreboard defaults
  scoreboardHomeTeam?: string | null;
  scoreboardAwayTeam?: string | null;
  scoreboardHomeColor?: string | null;
  scoreboardAwayColor?: string | null;
}

/**
 * List DirectStreams Filters
 */
export interface IListOwnerDirectStreamsFilters {
  ownerAccountId: string;
  status?: 'active' | 'archived' | 'deleted' | 'all';
  sortBy?: 'scheduledStartAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * DirectStream summary for list view
 */
export interface IOwnerDirectStreamSummary {
  id: string;
  slug: string;
  title: string;
  streamUrl: string | null;
  scheduledStartAt: Date | null;
  status: string;
  paywallEnabled: boolean;
  priceInCents: number;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  listed: boolean;
  eventsCount: number;
  registrationsCount: number;
  createdAt: Date;
}

/**
 * Owner DirectStream Reader Interface (ISP)
 *
 * Read operations scoped to an owner account
 */
export interface IOwnerDirectStreamReader {
  /**
   * Get a DirectStream by ID, scoped to owner
   */
  getByIdForOwner(id: string, ownerAccountId: string): Promise<DirectStream | null>;

  /**
   * Get a DirectStream by slug, scoped to owner
   */
  getBySlugForOwner(slug: string, ownerAccountId: string): Promise<DirectStream | null>;

  /**
   * Check if a slug is available
   */
  isSlugAvailable(slug: string): Promise<boolean>;

  /**
   * List DirectStreams for an owner with filters
   */
  listForOwner(filters: IListOwnerDirectStreamsFilters): Promise<IOwnerDirectStreamSummary[]>;
}

/**
 * Owner DirectStream Writer Interface (ISP)
 *
 * Write operations for owner-managed DirectStreams
 */
export interface IOwnerDirectStreamWriter {
  /**
   * Create a new DirectStream
   */
  create(input: ICreateOwnerDirectStreamInput): Promise<DirectStream>;

  /**
   * Update an existing DirectStream
   */
  update(id: string, input: IUpdateOwnerDirectStreamInput): Promise<DirectStream>;

  /**
   * Archive a DirectStream (soft status change)
   */
  archive(id: string): Promise<DirectStream>;
}
